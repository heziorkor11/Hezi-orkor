/** Display-only product name overrides. Source catalog JSON is left unchanged. */
import overrides from "../../public/catalog/name-overrides.json" with { type: "json" };
import type { SearchHit } from "./catalog-types.ts";

const bySku = (overrides.bySku || {}) as Record<string, string>;

export function getNameOverride(sku?: string): string | undefined {
  if (!sku) return undefined;
  const name = bySku[sku];
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed || undefined;
}

export function applySearchHitNameOverride(hit: SearchHit): SearchHit {
  const name = getNameOverride(hit.sku);
  if (!name || name === hit.title) return hit;
  return { ...hit, title: name, titleOriginal: hit.titleOriginal || hit.title };
}
