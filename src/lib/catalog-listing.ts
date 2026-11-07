import { refreshAdminOverlay, adminProductOverride, adminSnapshot } from "./admin/overlay";
import { displayCategory, isHiddenProduct } from "@/lib/display-taxonomy";
import {
  typeFromCategory,
  PAGE_SIZE,
  type ListingCard,
  type ListingResult,
  type ListingSearch,
  type Product,
  type SearchHit,
} from "@/lib/catalog-types";
import { displayModel, polishText, unique, loadManifest } from "@/lib/catalog-runtime";
import { catalogJson } from "@/lib/catalog-io";
import { imageLooksLikeSharedOe, inferCategory, yearsFromTitle } from "@/lib/part-display";
import { expandProductName } from "@/lib/name-expand";

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

let imagePromise: Promise<Record<string, string>> | undefined;
async function loadImageMap() {
  if (cache.images) return cache.images;
  if (imagePromise) return imagePromise;
  imagePromise = readImageMap().catch((e) => {
    imagePromise = undefined;
    throw e;
  });
  return imagePromise;
}
async function readImageMap() {
  if (!cache.images) {
    const listed = [
      "images-a.json",
      "images-b.json",
      "images-galor.json",
      "images-hot.json",
      "images-new.json",
    ];
    const pack = await catalogJson<{ files: string[] }>("images/manifest.json").catch(() => ({
      files: [] as string[],
    }));
    const files = listed.concat((pack.files || []).map((f) => `images/${f}`));
    const parts = await Promise.all(
      files.map((f) => catalogJson<Record<string, string>>(f).catch(() => ({}))),
    );
    cache.images = Object.assign({}, ...parts);
  }
  return cache.images!;
}

function resolveImage(sku?: string, existing?: string, oe?: string) {
  const mapped = sku && cache.images ? cache.images[sku] : undefined;
  const candidate =
    (mapped && usableRaw(mapped) ? mapped : undefined) ||
    (usableRaw(existing) ? existing : undefined);
  if (!candidate) return undefined;
  if (imageLooksLikeSharedOe(candidate, oe)) return undefined;
  if (candidate.startsWith("/")) return candidate;
  if (candidate.startsWith("g:"))
    return `https://galor-shop.com/uploads/photos/${candidate.slice(2)}`;
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
  const yearFrom = named?.from || card.yearFrom || 0;
  const yearTo = named?.to || card.yearTo || 0;
  let category =
    card.category && card.category !== "general"
      ? card.category
      : inferCategory(card.name, card.category);
  const nm = card.name || "";
  // High-confidence name corrections (SKU/name/price unchanged).
  if (/מדחס/.test(nm) && category === "lights") category = "ac-compressor";
  else if (
    (/\bמ\.דלק\b/.test(nm) || nm.startsWith("מ.דלק") || nm.includes("משאבת דלק")) &&
    !/(מסנן|פילטר).{0,12}(מ\.?דלק|דלק)|(מ\.?דלק|דלק).{0,12}(מסנן|פילטר)/.test(nm) &&
    category === "filters"
  )
    category = "fuel-pump";
  else if (
    /משאבת מצמד|מ\.מצמד|סט מצמד|ס\.מצמד|גלגל תנופה|ג\.תנופה/.test(nm) &&
    (category === "general" || category === "shocks")
  )
    category = "clutch";
  else if (
    /קצה הגה|ק\.הגה|מוט קישור|מ\.קישור|משאבת הגה/.test(nm) &&
    (category === "general" || category === "shocks")
  )
    category = "steering";
  else if (
    !/^בולם\b/.test(nm) &&
    /תפוח פרונט|ת\.פרונט|גומי מייצב|זרוע קדמית|ז\.פרונט|תושבת בולם|ת\.בולם/.test(nm) &&
    (category === "general" || category === "shocks")
  )
    category = "suspension";
  else if (/^בולם\b/.test(nm) && category === "general") category = "shocks";
  category = displayCategory(card.sku, category);
  return {
    id: card.id || card.sku,
    sku: card.sku,
    oe: card.oe || "",
    name: polishText(expandProductName(card.name).name),
    nameOriginal: card.nameOriginal || expandProductName(card.name).nameOriginal,
    type: typeFromCategory(category),
    category,
    make,
    model,
    yearFrom,
    yearTo,
    side: polishText(card.side || ""),
    condition: card.condition || "חלק חדש",
    description: polishText(card.description || ""),
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

const chunkPromises = new Map<string, Promise<Product[]>>();
async function loadChunk(id: string): Promise<Product[]> {
  if (cache.chunks.has(id)) return cache.chunks.get(id)!;
  const pending = chunkPromises.get(id);
  if (pending) return pending;
  const promise = readChunk(id).finally(() => chunkPromises.delete(id));
  chunkPromises.set(id, promise);
  return promise;
}
async function readChunk(id: string) {
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
    cache.featured = rows
      .filter((row) => !isHiddenProduct(row.sku))
      .map((row) => cardToProduct(row))
      .filter((p) => {
        if (!p.image) return true;
        if (seen.has(p.image)) p.image = undefined;
        else seen.add(p.image);
        return true;
      });
  }
  await refreshAdminOverlay();
  const chosen = adminSnapshot().home.featuredSkus;
  if (chosen !== undefined)
    return (await Promise.all(chosen.map(loadProductImpl))).filter((p): p is Product => !!p);
  return cache.featured.map(applyAdminProduct).filter((p): p is Product => !!p);
}

export async function loadBaseProductImpl(sku: string): Promise<Product | undefined> {
  const id = decodeURIComponent(sku || "").trim();
  if (!id || isHiddenProduct(id)) return undefined;
  const map = await loadSkuMap();
  const chunkId = map[id];
  if (!chunkId) return undefined;
  const chunk = await loadChunk(chunkId);
  return chunk.find((p) => p.sku === id || p.id === id);
}

function applyAdminProduct(p: Product): Product | undefined {
  const o = adminProductOverride(p.sku);
  if (o?.hidden) return undefined;
  return {
    ...p,
    ...(o?.name ? { name: o.name } : {}),
    ...(o?.category ? { category: o.category, type: typeFromCategory(o.category) } : {}),
    ...(o?.image ? { image: o.image } : {}),
  };
}
export async function loadProductImpl(sku: string): Promise<Product | undefined> {
  await refreshAdminOverlay();
  const p = await loadBaseProductImpl(sku);
  return p ? applyAdminProduct(p) : undefined;
}

export async function loadRelatedImpl(product: Product, limit = 4): Promise<Product[]> {
  const map = await loadSkuMap();
  const chunkId = map[product.sku];
  if (!chunkId) return [];
  const chunk = await loadChunk(chunkId);
  const others = chunk.filter((p) => p.sku !== product.sku && !isHiddenProduct(p.sku));
  const sameCar = others.filter(
    (p) => product.make && p.make === product.make && (!product.model || p.model === product.model),
  );
  const pool = sameCar.length ? sameCar : others.filter((p) => p.category === product.category);
  await refreshAdminOverlay();
  return pool
    .map(applyAdminProduct)
    .filter((p): p is Product => !!p)
    .slice(0, limit);
}

export async function loadListingImpl(
  state: ListingSearch,
  opts: { filterHit: (hit: SearchHit, state: ListingSearch) => boolean },
): Promise<ListingResult> {
  await loadImageMap();
  const manifest = await loadManifest();
  const page = Math.max(1, state.page ?? 1);
  if (!cache.searchIndex) cache.searchIndex = await catalogJson<SearchHit[]>("search-index.json");
  await refreshAdminOverlay();
  const hits = cache.searchIndex
    .map((hit) => ({ ...hit, title: adminProductOverride(hit.sku)?.name || hit.title }))
    .filter((hit) => !adminProductOverride(hit.sku)?.hidden && opts.filterHit(hit, state));
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
    const display = product ? applyAdminProduct(product) : undefined;
    if (display) items.push(display);
  }
  return { items, total: hits.length, page: current, pages };
}
