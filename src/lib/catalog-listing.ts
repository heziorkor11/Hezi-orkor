import { hasRealProductImage, imagesFirst } from "./product-image-policy";
import { parseListingSort, sortListingHits } from "./listing-sort";
import { displaySpacing } from "@/lib/display-spacing";
import { displayCategory, isHiddenProduct } from "@/lib/display-taxonomy";
import { typeFromCategory, PAGE_SIZE, type ListingCard, type ListingResult, type ListingSearch, type Product, type SearchHit } from "@/lib/catalog-types";
import { displayModel, polishText, unique } from "@/lib/catalog-runtime";
import { catalogJson } from "@/lib/catalog-io";
import { imageLooksLikeSharedOe, inferCategory, yearsFromTitle } from "@/lib/part-display";
import { expandProductName } from "@/lib/name-expand";
import { applySearchHitNameOverride, getNameOverride } from "@/lib/name-overrides";

const cache = {
  searchIndex: undefined as SearchHit[] | undefined,
  skuMap: undefined as Record<string, string> | undefined,
  pages: new Map<number, ListingCard[]>(),
  chunks: new Map<string, Product[]>(),
  featured: undefined as Product[] | undefined,
  images: undefined as Record<string, string> | undefined,
};

function wixImage(id: string) {
  if (!id || isHiddenProduct(id)) return undefined;
  if (id.startsWith("http")) return id;
  return `https://static.wixstatic.com/media/${id}/v1/fit/w_600,h_600,q_80/file.jpg`;
}

function usableRaw(value?: string) {
  if (!value) return false;
  if (value.startsWith("/products/")) return false;
  if (value.startsWith("/catalog/") && !value.startsWith("/catalog/images/")) return false;
  if (value.endsWith("/photos/") || value.endsWith("/photos")) return false;
  return true;
}

async function loadImageMap() {
  if (!cache.images) {
    const listed = ["images-a.json", "images-b.json", "images-galor.json", "images-hot.json", "images-new.json"];
    const pack = await catalogJson<{ files: string[] }>("images/manifest.json").catch(() => ({ files: [] as string[] }));
    const files = listed.concat((pack.files || []).map((f) => `images/${f}`));
    const parts = await Promise.all(files.map((f) => catalogJson<Record<string, string>>(f).catch(() => ({}))));
    cache.images = Object.assign({}, ...parts);
  }
  return cache.images;
}

function resolveImage(sku?: string, existing?: string, oe?: string) {
  const mapped = sku && cache.images ? cache.images[sku] : undefined;
  const candidate = (mapped && usableRaw(mapped) ? mapped : undefined) || (usableRaw(existing) ? existing : undefined);
  if (!candidate) return undefined;
  if (imageLooksLikeSharedOe(candidate, oe)) return undefined;
  if (candidate.startsWith("/")) return candidate;
  if (candidate.startsWith("g:")) return `https://galor-shop.com/uploads/photos/${candidate.slice(2)}`;
  if (candidate.startsWith("http")) return candidate;
  return wixImage(candidate);
}

function collapseRepeatedWords(text: string) {
  return (text || "").replace(/(\S+)(?:\s+\1)+/g, "$1");
}

function cardToProduct(card: ListingCard & Partial<Product>): Product {
  const make = collapseRepeatedWords(card.make || "");
  const model = displayModel(make, card.model || "");
  const named = yearsFromTitle(card.name);
  const hasVehicleYears = Boolean((card.make || card.model) && card.yearFrom);
  const yearFrom = (hasVehicleYears ? card.yearFrom : named?.from) || card.yearFrom || 0;
  const yearTo = (hasVehicleYears ? card.yearTo || card.yearFrom : named?.to) || card.yearTo || 0;
  let category = card.category && card.category !== "general" ? card.category : inferCategory(card.name, card.category);
  const nm = card.name || "";
  // High-confidence name corrections (SKU/name/price unchanged).
  if (/מדחס/.test(nm) && category === "lights") category = "ac-compressor";
  else if ((/\bמ\.דלק\b/.test(nm) || nm.startsWith("מ.דלק") || nm.includes("משאבת דלק")) && !/(מסנן|פילטר).{0,12}(מ\.?דלק|דלק)|(מ\.?דלק|דלק).{0,12}(מסנן|פילטר)/.test(nm) && category === "filters") category = "fuel-pump";
  else if (/משאבת מצמד|מ\.מצמד|סט מצמד|ס\.מצמד|גלגל תנופה|ג\.תנופה/.test(nm) && (category === "general" || category === "shocks")) category = "clutch";
  else if ((/קצה הגה|ק\.הגה|מוט קישור|מ\.קישור|משאבת הגה/.test(nm)) && (category === "general" || category === "shocks")) category = "steering";
  else if (!/^בולם\b/.test(nm) && /תפוח פרונט|ת\.פרונט|גומי מייצב|זרוע קדמית|ז\.פרונט|תושבת בולם|ת\.בולם/.test(nm) && (category === "general" || category === "shocks")) category = "suspension";
  else if (/^בולם\b/.test(nm) && category === "general") category = "shocks";
  category = displayCategory(card.sku, category);
  const sourceName = card.name || "";
  const nameOverride = getNameOverride(card.sku);
  const displayName = nameOverride || sourceName;
  return {
    id: card.id || card.sku,
    sku: card.sku,
    oe: card.oe || "",
    name: displaySpacing(card.sku, polishText(expandProductName(displayName).name)),
    nameOriginal: card.nameOriginal || (nameOverride && nameOverride !== sourceName ? sourceName : expandProductName(sourceName).nameOriginal),
    type: typeFromCategory(category),
    category,
    make,
    model,
    yearFrom,
    yearTo,
    side: polishText(card.side || ""),
    condition: card.condition || "חלק חדש",
    description: displaySpacing(card.sku, polishText(card.description || "")),
    image: resolveImage(card.sku, card.image, card.oe),
    universal: Boolean(!make && !yearFrom && !(card.vehicleFitment || "").trim()),
    vehicleFitment: polishText(card.vehicleFitment || ""),
    fitments: Array.isArray(card.fitments) && card.fitments.length ? card.fitments : undefined,
  };
}

function padPage(n: number) {
  return String(n).padStart(4, "0");
}

async function loadSkuMap() {
  if (!cache.skuMap) cache.skuMap = await catalogJson<Record<string, string>>("sku-map.json");
  return cache.skuMap;
}

async function loadPage(n: number) {
  await loadImageMap();
  const page = Math.max(1, n);
  const hit = cache.pages.get(page);
  if (hit) return hit;
  const rows = await catalogJson<ListingCard[]>(`pages/${padPage(page)}.json`);
  cache.pages.set(page, rows);
  return rows;
}

async function loadChunk(id: string) {
  await loadImageMap();
  const hit = cache.chunks.get(id);
  if (hit) return hit;
  const rows = await catalogJson<ListingCard[]>(`chunks/${id}.json`);
  const products = rows.map((row) => cardToProduct(row));
  cache.chunks.set(id, products);
  return products;
}

export async function loadFeaturedImpl(): Promise<Product[]> {
  await loadImageMap();
  if (!cache.featured) {
    const rows = await catalogJson<ListingCard[]>("featured.json");
    const seen = new Set<string>();
    cache.featured = rows.filter((row) => !isHiddenProduct(row.sku)).map((row) => cardToProduct(row)).filter((p) => {
      if (!p.image) return true;
      if (seen.has(p.image)) p.image = undefined;
      else seen.add(p.image);
      return true;
    });
  }
  return imagesFirst(cache.featured, p => hasRealProductImage(p.image));
}

export async function loadProductImpl(sku: string): Promise<Product | undefined> {
  const id = decodeURIComponent(sku || "").trim();
  if (!id || isHiddenProduct(id)) return undefined;
  const map = await loadSkuMap();
  const chunkId = map[id];
  if (!chunkId) return undefined;
  const chunk = await loadChunk(chunkId);
  const product = chunk.find((p) => p.sku === id || p.id === id);
  if (!product) return undefined;
  const name = getNameOverride(product.sku);
  return name && name !== product.name ? { ...product, name } : product;
}

export async function loadRelatedImpl(product: Product, limit = 4): Promise<Product[]> {
  const map = await loadSkuMap();
  const chunkId = map[product.sku];
  if (!chunkId) return [];
  const chunk = await loadChunk(chunkId);
  const others = chunk.filter((p) => p.sku !== product.sku && !isHiddenProduct(p.sku));
  const sameCar = others.filter((p) => product.make && p.make === product.make && (!product.model || p.model === product.model));
  const pool = sameCar.length ? sameCar : others.filter((p) => p.category === product.category);
  return imagesFirst(pool, p => hasRealProductImage(p.image)).slice(0, limit);
}


async function loadSearchIndex(): Promise<SearchHit[]> {
  await loadImageMap();
  if (!cache.searchIndex) {
    const rows = await catalogJson<SearchHit[]>("search-index.json");
    cache.searchIndex = rows;
  }
  return cache.searchIndex.map(applySearchHitNameOverride);
}

export async function loadSearchHits(): Promise<SearchHit[]> {
  return loadSearchIndex();
}

export function resolveProductImage(sku: string, oe?: string): string | undefined {
  return resolveImage(sku, undefined, oe);
}

export async function loadListingImpl(
  state: ListingSearch,
  opts: { filterHit: (hit: SearchHit, state: ListingSearch) => boolean },
): Promise<ListingResult> {
  await loadImageMap();
  const manifest = await (await import("./catalog-runtime")).loadManifest();
  const page = Math.max(1, state.page ?? 1);
  const searchIndex = await loadSearchIndex();
  // Sort the full filtered result BEFORE pagination, not just the visible page.
  // Default: real photo first, then display name. Workshop-packs always photo-first.
  const filtered = searchIndex.filter((hit) => opts.filterHit(hit, state));
  const sort = parseListingSort(state.sort);
  const workshopListing = state.category === "workshop-packs";
  const hits = sortListingHits(filtered, sort, {
    hasImage: (hit) => hasRealProductImage(resolveImage(hit.sku, undefined, hit.oe)),
    nameOf: (hit) => hit.title || "",
    forceImageFirst: workshopListing,
  });
  const pages = Math.max(1, Math.ceil(hits.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = hits.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const map = await loadSkuMap();
  const chunkIds = unique(slice.map((h) => map[h.sku]).filter(Boolean));
  await Promise.all(chunkIds.map((id) => loadChunk(id)));
  const items: Product[] = [];
  for (const hit of slice) {
    const chunk = cache.chunks.get(map[hit.sku]);
    const product = chunk?.find((p) => p.sku === hit.sku);
    if (product) items.push(product);
  }
  return { items, total: hits.length, page: current, pages };
}
