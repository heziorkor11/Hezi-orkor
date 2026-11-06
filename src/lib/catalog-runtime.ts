import { canonicalModel, dedupeModels, sameModel } from "@/lib/model-names";
import {
  brand,
  categories,
  type CatalogFacets,
  type CatalogManifest,
  type Product,
  type ProductFilter,
  type VehicleFitment,
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
  [/\bק\.\u05d4גה\b/g, "קצה הגה"],
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


export function productFitments(product: Product): VehicleFitment[] {
  if (Array.isArray(product.fitments) && product.fitments.length) return product.fitments;
  if (product.make) {
    return [{ make: product.make, model: product.model || "", yearFrom: product.yearFrom || 0, yearTo: product.yearTo || 0 }];
  }
  return [];
}

/** Prefer the fitment matching active finder filters; else the primary (first with model). */
export function pickDisplayedFitment(product: Product, filter?: ProductFilter): {
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  extraCount: number;
} {
  const all = productFitments(product);
  const extra = Math.max(0, all.length - 1);
  let chosen = all.find((f) => f.model) || all[0];

  if (filter?.make || filter?.model || filter?.year) {
    const y = filter.year ? Number(String(filter.year).replace(/["']/g, "")) : NaN;
    const hit = all.find((f) => {
      if (filter.make && f.make !== filter.make) return false;
      if (filter.model && !sameModel(filter.make || f.make || "", f.model, filter.model)) return false;
      if (Number.isFinite(y)) {
        const from = f.yearFrom || 0;
        const to = f.yearTo || f.yearFrom || 0;
        if (from && to && (y < from || y > to)) return false;
      }
      return true;
    });
    if (hit) chosen = hit;
  }

  if (!chosen) {
    return { make: product.make || "", model: product.model || "", yearFrom: product.yearFrom || 0, yearTo: product.yearTo || 0, extraCount: 0 };
  }
  return {
    make: chosen.make || "",
    model: chosen.model || "",
    yearFrom: chosen.yearFrom || 0,
    yearTo: chosen.yearTo || 0,
    extraCount: filter?.make || filter?.model || filter?.year ? 0 : extra,
  };
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
