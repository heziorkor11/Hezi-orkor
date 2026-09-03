import { typeFromCategory, PAGE_SIZE, type ListingCard, type ListingResult, type ListingSearch, type Product, type SearchHit } from "@/lib/catalog-types";
import { displayModel, polishText, unique } from "@/lib/catalog-runtime";
import { catalogJson } from "@/lib/catalog-io";
import { imageLooksLikeSharedOe, inferCategory, yearsFromTitle } from "@/lib/part-display";

const cache = {
  searchIndex: undefined as SearchHit[] | undefined,
  skuMap: undefined as Record<string, string> | undefined,
  pages: new Map<number, ListingCard[]>(),
  chunks: new Map<string, Product[]>(),
  featured: undefined as Product[] | undefined,
  images: undefined as Record<string, string> | undefined,
};

function wixImage(id: string) {
  if (!id) return undefined;
  if (id.startsWith("http")) return id;
  return `https://static.wixstatic.com/media/${id}/v1/fit/w_600,h_600,q_80/file.jpg`;
}

function usableRaw(value?: string) {
  if (!value) return false;
  if (value.startsWith("/products/") || value.startsWith("/catalog/")) return false;
  if (value.endsWith("/photos/") || value.endsWith("/photos")) return false;
  return true;
}

async function loadImageMap() {
  if (!cache.images) {
    const listed = ["images-a.json", "images-b.json", "images-galor.json", "images-hot.json"];
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
  const yearFrom = named?.from || card.yearFrom || 0;
  const yearTo = named?.to || card.yearTo || 0;
  const category = card.category && card.category !== "general" ? card.category : inferCategory(card.name, card.category);
  return {
    id: card.id || card.sku,
    sku: card.sku,
    oe: card.oe || "",
    name: polishText(card.name),
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
    cache.featured = rows.map((row) => cardToProduct(row)).filter((p) => {
      if (!p.image) return true;
      if (seen.has(p.image)) p.image = undefined;
      else seen.add(p.image);
      return true;
    });
  }
  return cache.featured;
}

export async function loadProductImpl(sku: string): Promise<Product | undefined> {
  const id = decodeURIComponent(sku || "").trim();
  if (!id) return undefined;
  const map = await loadSkuMap();
  const chunkId = map[id];
  if (!chunkId) return undefined;
  const chunk = await loadChunk(chunkId);
  return chunk.find((p) => p.sku === id || p.id === id);
}

export async function loadRelatedImpl(product: Product, limit = 4): Promise<Product[]> {
  const map = await loadSkuMap();
  const chunkId = map[product.sku];
  if (!chunkId) return [];
  const chunk = await loadChunk(chunkId);
  const others = chunk.filter((p) => p.sku !== product.sku);
  const sameCar = others.filter((p) => product.make && p.make === product.make && (!product.model || p.model === product.model));
  const pool = sameCar.length ? sameCar : others.filter((p) => p.category === product.category);
  return pool.slice(0, limit);
}

export async function loadListingImpl(
  state: ListingSearch,
  opts: { filterHit: (hit: SearchHit, state: ListingSearch) => boolean },
): Promise<ListingResult> {
  await loadImageMap();
  const manifest = await (await import("./catalog-runtime")).loadManifest();
  const page = Math.max(1, state.page ?? 1);
  const needsIndex = Boolean(state.q || state.make || state.model || state.year || state.type);

  if (!needsIndex && state.category) {
    const cat = manifest.categories.find((c) => c.id === state.category);
    if (cat && typeof cat.offset === "number") {
      const pages = Math.max(1, Math.ceil(cat.count / PAGE_SIZE));
      const current = Math.min(page, pages);
      const start = cat.offset + (current - 1) * PAGE_SIZE;
      const first = Math.floor(start / PAGE_SIZE) + 1;
      const last = Math.floor((start + PAGE_SIZE - 1) / PAGE_SIZE) + 1;
      const loaded = await Promise.all(Array.from({ length: last - first + 1 }, (_, i) => loadPage(first + i)));
      const merged = loaded.flat();
      const offset = start - (first - 1) * PAGE_SIZE;
      const items = merged.slice(offset, offset + PAGE_SIZE).map((card) => cardToProduct(card));
      return { items, total: cat.count, page: current, pages };
    }
  }

  if (!needsIndex && !state.category) {
    const pages = Math.max(1, Math.ceil(manifest.total / PAGE_SIZE));
    const current = Math.min(page, pages);
    const cards = await loadPage(current);
    return { items: cards.map((card) => cardToProduct(card)), total: manifest.total, page: current, pages };
  }

  if (!cache.searchIndex) cache.searchIndex = await catalogJson<SearchHit[]>("search-index.json");
  const hits = cache.searchIndex.filter((hit) => opts.filterHit(hit, state));
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
