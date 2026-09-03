import { canonicalModel, dedupeModels } from "@/lib/model-names";
import {
  brand,
  categories,
  type CatalogFacets,
  type CatalogManifest,
  type Product,
} from "@/lib/catalog-types";
import { catalogJson } from "@/lib/catalog-io";

type Cache = {
  manifest?: CatalogManifest;
  facets?: CatalogFacets;
};

const cache: Cache = {};

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
    cache.facets = { makes: raw.makes || [], modelsByMake, yearsByMakeModel };
  }
  return cache.facets;
}
