import type { PublicOverlay, TagDef } from "./types";
import type { AddedProduct } from "./added-product";

let runtime: PublicOverlay = {};

export function getPublicOverlay(): PublicOverlay {
  return runtime;
}

export function setPublicOverlay(next: PublicOverlay) {
  runtime = next || {};
}

export function mergeOverlay(partial: Partial<PublicOverlay>) {
  runtime = { ...runtime, ...partial };
}

export function overlayProductTags(sku: string, fallback: string[]): string[] {
  const map = runtime.productTags;
  const ids = map && Object.prototype.hasOwnProperty.call(map, sku) ? map[sku] || [] : fallback;
  return ids.slice(0, 2);
}

export function overlayTagLibrary(fallback: TagDef[]): TagDef[] {
  return runtime.tagLibrary?.length ? runtime.tagLibrary : fallback;
}

export function overlayHomeDeals(fallback: readonly string[]): string[] {
  return runtime.homeDeals?.length ? runtime.homeDeals : [...fallback];
}

export function overlayPrice(sku: string): number | undefined {
  const v = runtime.priceBySku?.[sku];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
}

export function overlayPriceHidden(sku: string): boolean {
  return Boolean(runtime.priceHideSkus?.includes(sku));
}

export function overlayName(sku: string): string | undefined {
  const n = runtime.nameBySku?.[sku];
  return n?.trim() || undefined;
}

export function overlayHiddenSku(sku: string): boolean | undefined {
  const m = runtime.hiddenSkus;
  if (!m || !Object.prototype.hasOwnProperty.call(m, sku)) return undefined;
  return m[sku];
}

export function overlayHiddenCategories(fallback: string[]): string[] {
  return runtime.hiddenCategories ?? fallback;
}

export function overlayCategoryLabel(id: string, fallback: string): string {
  return runtime.categoryLabels?.[id] || fallback;
}

export function overlayCategoryOfSku(sku: string): string | undefined {
  return runtime.categoryBySku?.[sku];
}

export function overlayImage(sku: string): string | undefined {
  const v = runtime.imageBySku?.[sku];
  return v?.trim() || undefined;
}

export function overlayStock(sku: string): string | undefined {
  const v = runtime.stockBySku?.[sku];
  return v?.trim() || undefined;
}

export function overlayAdditions(): Record<string, AddedProduct> {
  return runtime.additions || {};
}

export function overlayAddedProduct(sku: string): AddedProduct | undefined {
  return runtime.additions?.[sku];
}
