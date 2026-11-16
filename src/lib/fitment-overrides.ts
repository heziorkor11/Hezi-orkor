/** Display-only vehicle fitment overrides. Source catalog JSON is left unchanged. */
import overrides from "../../public/catalog/fitment-overrides.json" with { type: "json" };
import type { Product, SearchHit, VehicleFitment } from "./catalog-types.ts";

type RawFitment = {
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
};

type RawEntry = {
  fitments?: RawFitment[];
};

const bySku = (overrides.bySku || {}) as Record<string, RawEntry>;

function asYear(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

export function normalizeOverrideFitments(raw?: RawFitment[] | null): VehicleFitment[] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const out: VehicleFitment[] = [];
  for (const entry of raw) {
    const make = String(entry?.make || "").trim();
    const model = String(entry?.model || "").trim();
    if (!make || !model) continue;
    const yearFrom = asYear(entry?.yearFrom);
    const yearTo = asYear(entry?.yearTo, yearFrom);
    out.push({ make, model, yearFrom, yearTo });
  }
  return out.length ? out : undefined;
}

export function getFitmentOverride(sku?: string): VehicleFitment[] | undefined {
  if (!sku) return undefined;
  return normalizeOverrideFitments(bySku[sku]?.fitments);
}

type FitmentTarget = {
  sku: string;
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  fitments?: VehicleFitment[];
};

export function applyFitmentOverride<T extends FitmentTarget>(item: T): T {
  const fitments = getFitmentOverride(item.sku);
  if (!fitments) return item;
  const primary = fitments[0];
  return {
    ...item,
    fitments,
    make: primary.make,
    model: primary.model,
    yearFrom: primary.yearFrom || item.yearFrom || 0,
    yearTo: primary.yearTo || primary.yearFrom || item.yearTo || 0,
  };
}

export function applySearchHitFitmentOverride(hit: SearchHit): SearchHit {
  return applyFitmentOverride(hit);
}

export function applyProductFitmentOverride(product: Product): Product {
  const next = applyFitmentOverride(product);
  if (next === product) return product;
  return { ...next, universal: false };
}
