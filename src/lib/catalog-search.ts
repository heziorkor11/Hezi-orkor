import { sameModel } from "@/lib/model-names";
import {
  type ListingResult,
  type ListingSearch,
  type Product,
  type ProductFilter,
  type SearchHit,
  typeFromCategory,
} from "@/lib/catalog-types";
import { loadFacets, unique } from "@/lib/catalog-runtime";
import { oeSearchTokens, yearBounds } from "@/lib/part-display";

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function looksLikePartNumber(q: string) {
  const compact = q.replace(/[\s-]/g, "");
  return /\d/.test(compact) && compact.length >= 5;
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

function queryMatchesHit(hit: SearchHit, raw: string) {
  const q = raw.trim();
  if (!q) return true;
  const s = q.toLowerCase();
  const title = hit.title || "";
  const make = hit.make || "";
  const model = hit.model || "";
  const sku = (hit.sku || "").toLowerCase();
  const oeTokens = oeSearchTokens(hit.oe);
  if (looksLikePartNumber(s)) {
    if (sku === s || sku.startsWith(s) || s.startsWith(sku)) return true;
    if (oeTokens.some((t) => t === s || t.startsWith(s) || s.startsWith(t))) return true;
    return tokenHit(title, q) || title.toLowerCase().includes(s);
  }
  if (tokenHit(title, q) || tokenHit(make, q) || tokenHit(model, q)) return true;
  if (s.length >= 3 && title.toLowerCase().includes(s)) return true;
  if (s.length >= 4 && (sku === s || sku.startsWith(s))) return true;
  return false;
}

function filterHit(hit: SearchHit, state: ProductFilter) {
  if (state.category && hit.category !== state.category) return false;
  if (state.make && hit.make !== state.make) return false;
  if (state.model && !sameModel(state.make || hit.make || "", hit.model, state.model)) return false;
  if (state.year) {
    const y = Number(String(state.year).replace(/["']/g, ""));
    const bounds = yearBounds(hit.title, hit.yearFrom, hit.yearTo);
    if (bounds && Number.isFinite(y) && (y < bounds.from || y > bounds.to)) return false;
  }
  if (state.type) {
    if (typeFromCategory(hit.category) !== state.type && hit.category !== state.type) return false;
  }
  if (state.q && !queryMatchesHit(hit, state.q)) return false;
  return true;
}

export async function loadListing(state: ListingSearch = {}): Promise<ListingResult> {
  const { loadListingImpl } = await import("./catalog-listing");
  return loadListingImpl(state, { filterHit });
}

export async function loadFeatured(): Promise<Product[]> {
  const { loadFeaturedImpl } = await import("./catalog-listing");
  return loadFeaturedImpl();
}

export async function loadProduct(sku: string): Promise<Product | undefined> {
  const { loadProductImpl } = await import("./catalog-listing");
  return loadProductImpl(sku);
}

export async function loadRelated(product: Product, limit = 4): Promise<Product[]> {
  const { loadRelatedImpl } = await import("./catalog-listing");
  return loadRelatedImpl(product, limit);
}

export async function makesFor(_state?: ProductFilter) {
  const facets = await loadFacets();
  return facets.makes;
}

export async function modelsFor(state: ProductFilter) {
  const facets = await loadFacets();
  if (state.make && facets.modelsByMake[state.make]) return facets.modelsByMake[state.make];
  return unique(Object.values(facets.modelsByMake).flat()).sort((a, b) => a.localeCompare(b, "he"));
}

export async function yearsFor(state: ProductFilter) {
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
}
