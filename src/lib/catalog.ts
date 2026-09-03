import catalogManifest from "../../public/catalog/manifest.json";

export type Product = {
  id: string;
  sku: string;
  oe: string;
  name: string;
  type: PartTypeId;
  category: string;
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  side: string;
  condition: string;
  description: string;
  image?: string;
  universal?: boolean;
  vehicleFitment?: string;
};

export type CategoryId = string;

export type PartTypeId =
  | "headlight"
  | "taillight"
  | "foglight"
  | "mirror"
  | "compressor"
  | "condenser"
  | "radiator"
  | "shock"
  | "sensor"
  | "fender"
  | "bumper"
  | "battery"
  | "accessory"
  | "cabin-filter"
  | "oil-filter"
  | "brake"
  | "spark-plug"
  | "fluid"
  | "filter"
  | "ignition-coil"
  | "bulb"
  | "additive"
  | "general";

export const PAGE_SIZE = 60;

export const brand = {
  name: "Hezi Orkor",
  nameHe: "חזי אורקור",
  tagline: "WE FIX EVERYTHING",
  taglineHe: "חלפים ואביזרים לרכב — מוצאים מהר",
  phone: "052-485-8516",
  phoneTel: "972524858516",
  whatsapp: "972524858516",
  freeShipFrom: 299,
  shipping: 49,
  hours: "א׳–ה׳ 08:00–17:00",
  city: "נהריה",
  street: "לוחמי הגטאות 24",
  address: "לוחמי הגטאות 24, נהריה",
  lat: 33.0058,
  lng: 35.0989,
  mapsQuery: "לוחמי הגטאות 24 נהריה",
} as const;

export type CatalogCategory = {
  id: string;
  name: string;
  count: number;
  offset?: number;
};

export type CatalogManifest = {
  generatedAt: string;
  total: number;
  pageSize: number;
  chunkSize?: number;
  sheet: string;
  categories: CatalogCategory[];
  chunkCount: number;
  pageCount: number;
  featuredCount?: number;
};

export type SearchHit = {
  sku: string;
  title: string;
  category: string;
  oe: string;
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
};

export type ListingCard = {
  id: string;
  sku: string;
  name: string;
  category: string;
  vehicleFitment?: string;
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  side?: string;
  image?: string;
  oe?: string;
};

export type CatalogFacets = {
  makes: string[];
  modelsByMake: Record<string, string[]>;
  yearsByMakeModel: Record<string, number[]>;
};

export type ProductFilter = {
  type?: string;
  make?: string;
  model?: string;
  year?: string;
  q?: string;
  category?: string;
};

export type ListingSearch = ProductFilter & { page?: number };

export type ListingResult = {
  items: Product[];
  total: number;
  page: number;
  pages: number;
};

const CATEGORY_TYPE: Record<string, PartTypeId> = {
  lights: "headlight",
  lighting: "foglight",
  "ac-compressor": "compressor",
  "ac-condenser": "condenser",
  "cabin-filter": "cabin-filter",
  "oil-filter": "oil-filter",
  filters: "filter",
  brakes: "brake",
  sensors: "sensor",
  "spark-plugs": "spark-plug",
  fluids: "fluid",
  "ignition-coils": "ignition-coil",
  additives: "additive",
  general: "general",
  radiator: "radiator",
  shocks: "shock",
  mirrors: "mirror",
  body: "fender",
  bumper: "bumper",
  electrical: "battery",
  accessories: "accessory",
  tools: "accessory",
};

export function typeFromCategory(category?: string): PartTypeId {
  if (!category) return "general";
  return CATEGORY_TYPE[category] || "general";
}

export const categories: { id: string; name: string }[] = (catalogManifest.categories as CatalogCategory[]).map(
  (c) => ({ id: c.id, name: c.name }),
);

export const partTypes: { id: PartTypeId; name: string; category: string }[] = [
  { id: "headlight", name: "פנס ראשי", category: "lights" },
  { id: "taillight", name: "פנס אחורי", category: "lights" },
  { id: "foglight", name: "פנס ערפל", category: "lighting" },
  { id: "mirror", name: "מראה צד", category: "mirrors" },
  { id: "compressor", name: "מדחס מזגן", category: "ac-compressor" },
  { id: "condenser", name: "מעבה מזגן", category: "ac-condenser" },
  { id: "cabin-filter", name: "פילטר מזגן", category: "cabin-filter" },
  { id: "oil-filter", name: "פילטר שמן", category: "oil-filter" },
  { id: "filter", name: "פילטר", category: "filters" },
  { id: "brake", name: "בלמים", category: "brakes" },
  { id: "radiator", name: "רדיאטור", category: "radiator" },
  { id: "shock", name: "בולם זעזועים", category: "shocks" },
  { id: "sensor", name: "חיישן", category: "sensors" },
  { id: "spark-plug", name: "מצת", category: "spark-plugs" },
  { id: "ignition-coil", name: "סליל הצתה", category: "ignition-coils" },
  { id: "fluid", name: "שמנים ונוזלים", category: "fluids" },
  { id: "additive", name: "תוסף", category: "additives" },
  { id: "fender", name: "כנף", category: "body" },
  { id: "bumper", name: "טמבון", category: "bumper" },
  { id: "battery", name: "מצבר / בוסטר", category: "electrical" },
  { id: "accessory", name: "אביזר כללי", category: "accessories" },
  { id: "general", name: "כללי", category: "general" },
];

export const reviews = [
  { name: "אורן כ.", text: "מצאתי פנס לפי דגם ושנה בלי להתקשר שלוש פעמים. הגיע מהר.", stars: 5 },
  { name: "דנה ל.", text: "שלחתי מק״ט בוואטסאפ ואישרו התאמה לפני ששילמתי. ככה צריך.", stars: 5 },
  { name: "מוסך ר.", text: "ברור מה צד ומה שנים. חוסך טעויות הזמנה.", stars: 5 },
];

export const faqs = [
  {
    q: "איך מוצאים חלק לפי הרכב?",
    a: "בבורר בראש העמוד בוחרים קטגוריה, יצרן, דגם ושנה. אפשר גם לחפש לפי מק״ט או מספר OE בשורת החיפוש.",
  },
  {
    q: "מה אם החלק לא מופיע באתר?",
    a: "שלחו מספר רכב, מק״ט מהחלק הישן או תמונה בוואטסאפ ונאתר התאמה. אין מחירים באתר — נשלח הצעת מחיר אחרי אישור התאמה.",
  },
  {
    q: "איך מזמינים ומשלמים?",
    a: "מוסיפים לסל ושולחים אלינו בוואטסאפ להצעת מחיר ולבירור מלאי. אין סליקה באתר — מאשרים התאמה ומחיר לפני תשלום.",
  },
  {
    q: "יש איסוף עצמי מנהריה?",
    a: "כן. אפשר לאסוף מלוחמי הגטאות 24, נהריה, בימים א׳–ה׳ 08:00–17:00, או לקבל משלוח.",
  },
  {
    q: "צריך לאשר התאמה לפני התקנה?",
    a: "כן. לפני התקנה מאשרים לפי מספר רכב או מק״ט OE — כדי לא להחליף חלק לא נכון.",
  },
] as const;

type Cache = {
  manifest?: CatalogManifest;
  searchIndex?: SearchHit[];
  skuMap?: Record<string, string>;
  facets?: CatalogFacets;
  featured?: Product[];
  pages: Map<number, ListingCard[]>;
  chunks: Map<string, Product[]>;
  images?: Record<string, string>;
};

const cache: Cache = { pages: new Map(), chunks: new Map() };

function wixImage(id: string) {
  if (!id) return undefined;
  if (id.startsWith("http")) return id;
  return `https://static.wixstatic.com/media/${id}/v1/fit/w_600,h_600,q_80/file.jpg`;
}

async function loadImageMap() {
  if (!cache.images) {
    const parts = await Promise.all([
      catalogJson<Record<string, string>>("images-a.json"),
      catalogJson<Record<string, string>>("images-b.json"),
      catalogJson<Record<string, string>>("images-galor.json").catch(() => ({})),
    ]);
    cache.images = { ...parts[0], ...parts[1], ...parts[2] };
  }
  return cache.images;
}

function resolveImage(sku?: string, existing?: string) {
  const mapped = sku && cache.images ? cache.images[sku] : undefined;
  const candidate = mapped || existing;
  if (!candidate) return undefined;
  if (candidate.startsWith("g:")) return `https://galor-shop.com/uploads/photos/${candidate.slice(2)}`;
  if (candidate.startsWith("http")) {
    if (candidate.endsWith("/photos/") || candidate.endsWith("/photos")) return undefined;
    return candidate;
  }
  return wixImage(candidate);
}

function catalogUrl(rel: string) {
  if (typeof window !== "undefined") return `/catalog/${rel}`;
  const vercel = typeof process !== "undefined" ? process.env.VERCEL_URL : "";
  const origin =
    (typeof process !== "undefined" && (process.env.CATALOG_ORIGIN || process.env.VITE_SITE_ORIGIN)) ||
    (vercel ? `https://${vercel}` : "http://127.0.0.1:8080");
  return `${String(origin).replace(/\/$/, "")}/catalog/${rel}`;
}

async function readCatalogText(rel: string): Promise<string> {
  if (import.meta.env.SSR) {
    try {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const cwd = process.cwd();
      const candidates = [
        join(cwd, "public", "catalog", rel),
        join(cwd, ".output", "public", "catalog", rel),
        join(cwd, ".vercel", "output", "static", "catalog", rel),
      ];
      for (const path of candidates) {
        try {
          return await readFile(path, "utf8");
        } catch {
          /* try next */
        }
      }
    } catch {
      /* fall through to fetch */
    }
  }
  const res = await fetch(catalogUrl(rel));
  if (!res.ok) throw new Error(`Failed to load catalog ${rel} (${res.status})`);
  return await res.text();
}

async function catalogJson<T>(rel: string): Promise<T> {
  return JSON.parse(await readCatalogText(rel)) as T;
}

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr.filter(Boolean))];
}

export function categoryName(id?: string) {
  if (!id) return undefined;
  return categories.find((c) => c.id === id)?.name;
}

export function waLink(text: string) {
  return `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function quoteMessage(product: { sku: string; name: string }) {
  return `שלום, אשמח להצעת מחיר ולבירור מלאי עבור מק״ט ${product.sku} — ${product.name}`;
}

export function fitmentLabel(product: Product) {
  const bits = [product.make, product.model].filter(Boolean);
  if (product.yearFrom) {
    bits.push(product.yearFrom === product.yearTo ? String(product.yearFrom) : `${product.yearFrom}–${product.yearTo}`);
  }
  if (bits.length) return bits.join(" ");
  const fit = (product.vehicleFitment || "").trim();
  if (fit) return fit.length > 80 ? `${fit.slice(0, 77)}…` : fit;
  return "יש לאשר לפי מספר רכב";
}

function cardToProduct(card: ListingCard & Partial<Product>): Product {
  const make = card.make || "";
  const model = card.model || "";
  const yearFrom = card.yearFrom || 0;
  const yearTo = card.yearTo || 0;
  return {
    id: card.id || card.sku,
    sku: card.sku,
    oe: card.oe || "",
    name: card.name,
    type: typeFromCategory(card.category),
    category: card.category,
    make,
    model,
    yearFrom,
    yearTo,
    side: card.side || "",
    condition: card.condition || "חלק חדש",
    description: card.description || "",
    image: resolveImage(card.sku, card.image),
    universal: Boolean(!make && !yearFrom && !(card.vehicleFitment || "").trim()),
    vehicleFitment: card.vehicleFitment || "",
  };
}

function padPage(n: number) {
  return String(n).padStart(4, "0");
}

export async function loadManifest(): Promise<CatalogManifest> {
  if (!cache.manifest) cache.manifest = await catalogJson<CatalogManifest>("manifest.json");
  return cache.manifest;
}

export async function loadFacets(): Promise<CatalogFacets> {
  if (!cache.facets) cache.facets = await catalogJson<CatalogFacets>("facets.json");
  return cache.facets;
}

export async function loadSearchIndex(): Promise<SearchHit[]> {
  if (!cache.searchIndex) cache.searchIndex = await catalogJson<SearchHit[]>("search-index.json");
  return cache.searchIndex;
}

async function loadSkuMap(): Promise<Record<string, string>> {
  if (!cache.skuMap) cache.skuMap = await catalogJson<Record<string, string>>("sku-map.json");
  return cache.skuMap;
}

export async function loadPage(n: number): Promise<ListingCard[]> {
  await loadImageMap();
  const page = Math.max(1, n);
  const hit = cache.pages.get(page);
  if (hit) return hit;
  const rows = await catalogJson<ListingCard[]>(`pages/${padPage(page)}.json`);
  cache.pages.set(page, rows);
  return rows;
}

async function loadChunk(id: string): Promise<Product[]> {
  await loadImageMap();
  const hit = cache.chunks.get(id);
  if (hit) return hit;
  const rows = await catalogJson<ListingCard[]>(`chunks/${id}.json`);
  const products = rows.map((row) => cardToProduct(row));
  cache.chunks.set(id, products);
  return products;
}

export async function loadFeatured(): Promise<Product[]> {
  await loadImageMap();
  if (!cache.featured) {
    const rows = await catalogJson<ListingCard[]>("featured.json");
    cache.featured = rows.map((row) => cardToProduct(row));
  }
  return cache.featured;
}

export async function loadProduct(sku: string): Promise<Product | undefined> {
  const id = decodeURIComponent(sku || "").trim();
  if (!id) return undefined;
  const map = await loadSkuMap();
  const chunkId = map[id];
  if (!chunkId) return undefined;
  const chunk = await loadChunk(chunkId);
  return chunk.find((p) => p.sku === id || p.id === id);
}

export async function loadRelated(product: Product, limit = 4): Promise<Product[]> {
  const map = await loadSkuMap();
  const chunkId = map[product.sku];
  if (!chunkId) return [];
  const chunk = await loadChunk(chunkId);
  return chunk.filter((p) => p.category === product.category && p.sku !== product.sku).slice(0, limit);
}

function filterHit(hit: SearchHit, state: ProductFilter) {
  if (state.category && hit.category !== state.category) return false;
  if (state.make && hit.make !== state.make) return false;
  if (state.model && hit.model !== state.model) return false;
  if (state.year) {
    const y = Number(state.year);
    if (hit.yearFrom && Number.isFinite(y) && (y < hit.yearFrom || y > (hit.yearTo || hit.yearFrom))) return false;
  }
  if (state.type) {
    if (typeFromCategory(hit.category) !== state.type && hit.category !== state.type) return false;
  }
  if (state.q) {
    const s = state.q.trim().toLowerCase();
    const blob = [hit.title, hit.sku, hit.oe, hit.make, hit.model, hit.category].join(" ").toLowerCase();
    if (!blob.includes(s)) return false;
  }
  return true;
}

async function loadSequential(start: number, count: number): Promise<Product[]> {
  if (count <= 0) return [];
  const first = Math.floor(start / PAGE_SIZE) + 1;
  const last = Math.floor((start + count - 1) / PAGE_SIZE) + 1;
  const pages = await Promise.all(
    Array.from({ length: last - first + 1 }, (_, i) => loadPage(first + i)),
  );
  const merged = pages.flat();
  const offset = start - (first - 1) * PAGE_SIZE;
  return merged.slice(offset, offset + count).map((card) => cardToProduct(card));
}

async function hydrateHits(hits: SearchHit[]): Promise<Product[]> {
  if (!hits.length) return [];
  const map = await loadSkuMap();
  const chunkIds = unique(hits.map((h) => map[h.sku]).filter(Boolean));
  await Promise.all(chunkIds.map((id) => loadChunk(id)));
  const out: Product[] = [];
  for (const hit of hits) {
    const chunkId = map[hit.sku];
    if (!chunkId) continue;
    const chunk = cache.chunks.get(chunkId);
    const product = chunk?.find((p) => p.sku === hit.sku);
    if (product) out.push(product);
  }
  return out;
}

export async function loadListing(state: ListingSearch = {}): Promise<ListingResult> {
  await loadImageMap();
  const manifest = await loadManifest();
  const page = Math.max(1, state.page ?? 1);
  const needsIndex = Boolean(state.q || state.make || state.model || state.year || state.type);

  if (!needsIndex && state.category) {
    const cat = manifest.categories.find((c) => c.id === state.category);
    if (cat && typeof cat.offset === "number") {
      const pages = Math.max(1, Math.ceil(cat.count / PAGE_SIZE));
      const current = Math.min(page, pages);
      const start = cat.offset + (current - 1) * PAGE_SIZE;
      const items = await loadSequential(start, PAGE_SIZE);
      return { items, total: cat.count, page: current, pages };
    }
  }

  if (!needsIndex && !state.category) {
    const pages = Math.max(1, Math.ceil(manifest.total / PAGE_SIZE));
    const current = Math.min(page, pages);
    const cards = await loadPage(current);
    return { items: cards.map((card) => cardToProduct(card)), total: manifest.total, page: current, pages };
  }

  const index = await loadSearchIndex();
  const hits = index.filter((hit) => filterHit(hit, state));
  const pages = Math.max(1, Math.ceil(hits.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = hits.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const items = await hydrateHits(slice);
  return { items, total: hits.length, page: current, pages };
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
  if (facets.yearsByMakeModel[key]) return facets.yearsByMakeModel[key];
  if (state.make) {
    const prefix = `${state.make}\t`;
    const years = Object.entries(facets.yearsByMakeModel)
      .filter(([k]) => k.startsWith(prefix))
      .flatMap(([, ys]) => ys);
    return unique(years).sort((a, b) => b - a);
  }
  return unique(Object.values(facets.yearsByMakeModel).flat()).sort((a, b) => b - a);
}
