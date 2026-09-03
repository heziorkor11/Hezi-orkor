import { canonicalModel, dedupeModels, sameModel } from "@/lib/model-names";
import {
  PAGE_SIZE,
  brand,
  categories,
  type CatalogFacets,
  type CatalogManifest,
  type ListingCard,
  type ListingResult,
  type ListingSearch,
  type Product,
  type ProductFilter,
  type SearchHit,
  typeFromCategory,
} from "@/lib/catalog-types";

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

function usableRaw(value?: string) {
  if (!value) return false;
  if (value.startsWith("/products/")) return false;
  if (value.startsWith("/catalog/")) return false;
  if (value.endsWith("/photos/") || value.endsWith("/photos")) return false;
  return true;
}

async function loadImageMap() {
  if (!cache.images) {
    const listed = ["images-a.json", "images-b.json", "images-galor.json", "images-hot.json"];
    const pack = await catalogJson<{ files: string[] }>("images/manifest.json").catch(() => ({ files: [] as string[] }));
    const files = listed.concat((pack.files || []).map((f) => `images/${f}`));
    const parts = await Promise.all(
      files.map((f) => catalogJson<Record<string, string>>(f).catch(() => ({} as Record<string, string>))),
    );
    cache.images = Object.assign({}, ...parts);
  }
  return cache.images;
}

function resolveImage(sku?: string, existing?: string) {
  const mapped = sku && cache.images ? cache.images[sku] : undefined;
  const candidate = (mapped && usableRaw(mapped) ? mapped : undefined) || (usableRaw(existing) ? existing : undefined);
  if (!candidate) return undefined;
  if (candidate.startsWith("g:")) return `https://galor-shop.com/uploads/photos/${candidate.slice(2)}`;
  if (candidate.startsWith("http")) return candidate;
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

const SHORTHAND: Array<[RegExp, string]> = [
  [/\bז\.\u05e4רונט\b/g, "זרוע קדמית"],
  [/\bז\.\u05d0חור\b/g, "זרוע אחורית"],
  [/\bק\.\u05d4גה\b/g, "קופסת הגה"],
  [/\bקדL\b/g, "קדמי שמאל"],
  [/\bקדR\b/g, "קדמי ימין"],
  [/\bאחL\b/g, "אחורי שמאל"],
  [/\bאחR\b/g, "אחורי ימין"],
];

function collapseRepeatedWords(text: string) {
  return (text || "").replace(/(\S+)(?:\s+\1)+/g, "$1");
}

export function polishText(text?: string) {
  let s = collapseRepeatedWords((text || "").trim());
  for (const [re, to] of SHORTHAND) s = s.replace(re, to);
  return s.replace(/\s+/g, " ").trim();
}

export function displayModel(make?: string, model?: string) {
  const cleaned = canonicalModel(make || "", model || "");
  return cleaned || collapseRepeatedWords((model || "").trim());
}

export function displayVehicle(make?: string, model?: string) {
  const mk = collapseRepeatedWords((make || "").trim());
  const md = displayModel(mk, model);
  if (mk && md && (md === mk || md.startsWith(`${mk} `))) return md;
  return [mk, md].filter(Boolean).join(" ");
}

export function fitmentLabel(product: Product) {
  const bits = [displayVehicle(product.make, product.model)].filter(Boolean);
  if (product.yearFrom) {
    bits.push(product.yearFrom === product.yearTo ? String(product.yearFrom) : `${product.yearFrom}–${product.yearTo}`);
  }
  if (bits.length) return bits.join(" ");
  const fit = polishText(product.vehicleFitment);
  if (fit) return fit.length > 80 ? `${fit.slice(0, 77)}…` : fit;
  return "יש לאשר לפי מספר רכב";
}

function cardToProduct(card: ListingCard & Partial<Product>): Product {
  const make = collapseRepeatedWords(card.make || "");
  const model = displayModel(make, card.model || "");
  const yearFrom = card.yearFrom || 0;
  const yearTo = card.yearTo || 0;
  return {
    id: card.id || card.sku,
    sku: card.sku,
    oe: card.oe || "",
    name: polishText(card.name),
    type: typeFromCategory(card.category),
    category: card.category,
    make,
    model,
    yearFrom,
    yearTo,
    side: polishText(card.side || ""),
    condition: card.condition || "חלק חדש",
    description: polishText(card.description || ""),
    image: resolveImage(card.sku, card.image),
    universal: Boolean(!make && !yearFrom && !(card.vehicleFitment || "").trim()),
    vehicleFitment: polishText(card.vehicleFitment || ""),
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
  if (!cache.facets) {
    const raw = await catalogJson<CatalogFacets>("facets.json");
    const modelsByMake: Record<string, string[]> = {};
    const yearsByMakeModel: Record<string, number[]> = {};
    for (const [make, models] of Object.entries(raw.modelsByMake || {})) {
      modelsByMake[make] = dedupeModels(make, models);
    }
    for (const [key, years] of Object.entries(raw.yearsByMakeModel || {})) {
      const [make, model = ""] = key.split("\t");
      const clean = canonicalModel(make, model);
      if (!clean) continue;
      const nextKey = `${make}\t${clean}`;
      const merged = new Set([...(yearsByMakeModel[nextKey] || []), ...years]);
      yearsByMakeModel[nextKey] = [...merged].sort((a, b) => b - a);
    }
    cache.facets = { makes: raw.makes, modelsByMake, yearsByMakeModel };
  }
  return cache.facets;
}
