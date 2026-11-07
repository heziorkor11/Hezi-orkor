import { effectivePrice } from "./admin/overlay";
import tax from "../../public/catalog/display-taxonomy.json";
import names from "../../public/catalog/price-identities.json";
const brandNames = names as Record<string, string>;
const identity = (sku: string) => ({
  category: tax.bySku[sku as keyof typeof tax.bySku]?.category || "general",
  brand: brandNames[sku] || "",
});
import pricesBySku from "../../public/catalog/prices.json";
import priceHideOverrides from "../../public/catalog/price-hide-overrides.json";

const map = pricesBySku as Record<string, number>;
const hidden = new Set((priceHideOverrides as { skus?: string[] }).skus?.filter(Boolean) ?? []);

/** Price from Matan's לאתר sheet, exact numeric as given. null = show quote CTA. */
export function catalogPrice(sku: string | undefined | null): number | null {
  if (!sku) return null;
  // Override: hide price for severe outliers (source map untouched)
  if (hidden.has(sku)) return null;
  const v = map[sku];
  const base = typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
  const p = identity(sku);
  return effectivePrice(sku, base, p?.category || "general", p.brand).price;
}

/** Format exactly — no rounding / no forced decimals. */
export function formatCatalogPrice(value: number): string {
  const text = Number.isInteger(value) ? String(value) : String(value);
  return `${text} ₪`;
}

export function priceOrQuoteLabel(sku: string | undefined | null): string {
  const p = catalogPrice(sku);
  return p == null ? "צור קשר להצעת מחיר" : formatCatalogPrice(p);
}

export function hasCatalogPrice(sku: string | undefined | null): boolean {
  return catalogPrice(sku) != null;
}

export function isPriceHiddenOverride(sku: string | undefined | null): boolean {
  return Boolean(sku && hidden.has(sku));
}

export function catalogPromotion(sku: string) {
  if (hidden.has(sku)) return undefined;
  const p = identity(sku);
  const v = map[sku];
  return effectivePrice(
    sku,
    typeof v === "number" && v > 0 ? v : null,
    p?.category || "general",
    p.brand,
  ).promo;
}
export function regularCatalogPrice(sku: string): number | null {
  if (hidden.has(sku)) return null;
  const p = identity(sku);
  return effectivePrice(sku, map[sku] || null, p?.category || "general", p.brand).regular;
}
