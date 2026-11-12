import { VEHICLE_OPTIONAL_CATEGORIES } from "./search-language";
import { displayCategory, displayOverride, isHiddenProduct, normalizeDisplayCategory } from "@/lib/display-taxonomy";
import {
  mergeFilterWithIntent,
  productFitsVehicle,
  tokensMatchHit,
  typeAllows,
} from "@/lib/search-intent";
import {
  type ListingResult,
  type ListingSearch,
  type Product,
  type ProductFilter,
  type SearchHit,
  typeFromCategory,
} from "@/lib/catalog-types";
import { loadFacets, unique } from "@/lib/catalog-runtime";
import { namePartNumberTokens, normalizePartKey, oeSearchTokens } from "@/lib/part-display";
import {
  classifyFluidKind,
  classifyOilBrand,
  isFluidsBrowseItem,
} from "@/lib/fluid-classify";
import { matchAxle, matchHand, parseViscosity } from "@/lib/tile-facets";
import type { CategoryTile } from "@/lib/category-tiles";

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function partKeyMatches(candidate: string, queryKey: string) {
  if (!candidate || !queryKey) return false;
  if (candidate === queryKey) return true;
  // Prefix: typed query is a prefix of the stored part number.
  if (queryKey.length >= 5 && candidate.startsWith(queryKey)) return true;
  // Allow a slightly longer typed form that starts with the stored part.
  if (candidate.length >= 5 && queryKey.startsWith(candidate) && queryKey.length - candidate.length <= 3) {
    return true;
  }
  return false;
}

function tokenHit(hay: string, needle: string) {
  const h = hay.trim();
  const n = needle.trim();
  if (!h || !n) return false;
  if (h === n) return true;
  try {
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeReg(n)}([^\\p{L}\\p{N}]|$)`, "iu").test(h);
  } catch {
    return h.includes(` ${n} `) || h.startsWith(`${n} `) || h.endsWith(` ${n}`);
  }
}

function queryMatchesPartNumber(hit: SearchHit, raw: string) {
  const q = raw.trim();
  if (!q) return true;
  const s = q.toLowerCase();
  const qKey = normalizePartKey(q);
  const title = hit.title || "";
  const titleOriginal = hit.titleOriginal || "";
  const sku = (hit.sku || "").toLowerCase();
  const skuKey = normalizePartKey(hit.sku);
  const oeTokens = oeSearchTokens(hit.oe);
  const nameTokens = [...namePartNumberTokens(title), ...namePartNumberTokens(titleOriginal)];
  const titles = [title, titleOriginal].filter(Boolean);
  if (partKeyMatches(skuKey, qKey) || sku === s || sku.startsWith(s)) return true;
  if (oeTokens.some((t) => partKeyMatches(normalizePartKey(t), qKey) || partKeyMatches(t, s))) return true;
  if (nameTokens.some((t) => partKeyMatches(normalizePartKey(t), qKey) || partKeyMatches(t, s))) return true;
  if (qKey.length >= 6 && normalizePartKey(hit.oe).includes(qKey)) return true;
  return titles.some((t) => tokenHit(t, q) || (qKey.length >= 6 && normalizePartKey(t).includes(qKey)));
}

function filterHit(hit: SearchHit, state: ProductFilter) {
  if (isHiddenProduct(hit.sku)) return false;
  const merged = mergeFilterWithIntent(state);
  hit = { ...hit, category: displayCategory(hit.sku, hit.category || "general") };
  const category = normalizeDisplayCategory(merged.category);
  const sub = merged.sub;
  const overrideSub = displayOverride(hit.sku)?.sub;
  if (sub && overrideSub !== sub) return false;
  if (merged.allowed.length && !typeAllows(hit.category, overrideSub, merged.allowed)) return false;
  const fluidsBrowse = category === "fluids" || Boolean(merged.fluidKind) || Boolean(merged.oilBrand);
  if (fluidsBrowse) {
    // Fluids UI: classify from title; include brake-fluid SKUs outside category=fluids.
    if (!isFluidsBrowseItem(hit.category, hit.title)) return false;
    if (merged.fluidKind) {
      if (classifyFluidKind(hit.title) !== merged.fluidKind) return false;
    } else if (category === "fluids") {
      // Default fluids landing = oils category only (not stray brake SKU), unless kind/brand set.
      if (hit.category !== "fluids") return false;
    }
    if (merged.oilBrand && classifyOilBrand(hit.title) !== merged.oilBrand) return false;
    // Do not apply vehicle make/model/year to fluids — OEM labels leaked into fitment.
  } else if (category && hit.category !== category) {
    return false;
  }
  if (!fluidsBrowse && !VEHICLE_OPTIONAL_CATEGORIES.includes(category || "") && (merged.make || merged.model || merged.year)) {
    if (!productFitsVehicle(hit, merged.make, merged.model, merged.year)) return false;
  }
  if (merged.type) {
    if (typeFromCategory(hit.category) !== merged.type && hit.category !== merged.type) return false;
  }
  if (merged.q) {
    if (merged.isPartNumber) {
      if (!queryMatchesPartNumber(hit, merged.q)) return false;
    } else if (!tokensMatchHit(hit, merged.restTokens)) {
      return false;
    }
  }
  if (merged.viscosity && parseViscosity(hit.title) !== merged.viscosity) return false;
  if (merged.axle && matchAxle(hit.title) !== merged.axle) return false;
  if (merged.hand && matchHand(hit.title) !== merged.hand) return false;
  return true;
}

/** Shared listing predicate — also used to count category photo tiles. */
export function matchesListingHit(hit: SearchHit, state: ProductFilter) {
  return filterHit(hit, state);
}

export async function loadListing(state: ListingSearch = {}): Promise<ListingResult> {
  try {
    const { loadListingImpl } = await import("./catalog-listing");
    return await loadListingImpl(state, { filterHit });
  } catch (err) {
    console.error("[catalog] loadListing failed", err);
    return { items: [], total: 0, page: 1, pages: 1 };
  }
}

export async function loadCategoryTiles(state: ListingSearch = {}): Promise<CategoryTile[]> {
  try {
    const { loadSearchHits, resolveProductImage } = await import("./catalog-listing");
    const { buildCategoryTiles } = await import("./category-tiles");
    const hits = await loadSearchHits();
    return buildCategoryTiles(state, hits, {
      imageOf: resolveProductImage,
      hitMatches: filterHit,
    });
  } catch (err) {
    console.error("[catalog] loadCategoryTiles failed", err);
    return [];
  }
}

export async function loadFeatured(): Promise<Product[]> {
  try {
    const { loadFeaturedImpl } = await import("./catalog-listing");
    return await loadFeaturedImpl();
  } catch (err) {
    console.error("[catalog] loadFeatured failed", err);
    return [];
  }
}

export async function loadProductsBySkus(skus: readonly string[]): Promise<Product[]> {
  try {
    const { loadProductImpl } = await import("./catalog-listing");
    const out: Product[] = [];
    for (const sku of skus) {
      const p = await loadProductImpl(sku);
      if (p) out.push(p);
    }
    return out;
  } catch (err) {
    console.error("[catalog] loadProductsBySkus failed", err);
    return [];
  }
}

export async function loadProduct(sku: string): Promise<Product | undefined> {
  try {
    const { loadProductImpl } = await import("./catalog-listing");
    return await loadProductImpl(sku);
  } catch (err) {
    console.error("[catalog] loadProduct failed", err);
    return undefined;
  }
}

export async function loadRelated(product: Product, limit = 4): Promise<Product[]> {
  try {
    const { loadRelatedImpl } = await import("./catalog-listing");
    return await loadRelatedImpl(product, limit);
  } catch (err) {
    console.error("[catalog] loadRelated failed", err);
    return [];
  }
}

export async function makesFor(_state?: ProductFilter) {
  try {
    const facets = await loadFacets();
    return facets.makes;
  } catch {
    return [];
  }
}

export async function modelsFor(state: ProductFilter) {
  try {
    const facets = await loadFacets();
    if (state.make && facets.modelsByMake[state.make]) return facets.modelsByMake[state.make];
    return unique(Object.values(facets.modelsByMake).flat()).sort((a, b) => a.localeCompare(b, "he"));
  } catch {
    return [];
  }
}

export async function yearsFor(state: ProductFilter) {
  try {
    const facets = await loadFacets();
    const key = `${state.make || ""}\t${state.model || ""}`;
    const raw = facets.yearsByMakeModel[key] || [];
    if (raw.length > 12) {
      const hi = Math.max(...raw);
      const lo = Math.min(...raw);
      if (hi - lo > 12) return [hi, lo];
    }
    if (facets.yearsByMakeModel[key]) return raw;
    if (state.make) {
      const prefix = `${state.make}\t`;
      const years = Object.entries(facets.yearsByMakeModel)
        .filter(([k]) => k.startsWith(prefix))
        .flatMap(([, ys]) => ys);
      return unique(years).sort((a, b) => b - a);
    }
    return unique(Object.values(facets.yearsByMakeModel).flat()).sort((a, b) => b - a);
  } catch {
    return [];
  }
}
