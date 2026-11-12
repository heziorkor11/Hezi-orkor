import pricesBySku from "../../public/catalog/prices.json" with { type: "json" };
import priceHideOverrides from "../../public/catalog/price-hide-overrides.json" with { type: "json" };
import priceOverrides from "../../public/catalog/price-overrides.json" with { type: "json" };

const map = pricesBySku as Record<string, number>;
const hidden = new Set(
  (priceHideOverrides as { skus?: string[] }).skus?.filter(Boolean) ?? [],
);
const overrides = ((priceOverrides as { bySku?: Record<string, number> }).bySku || {}) as Record<
  string,
  number
>;

/** Display WJS / sale-price override when present. Source prices.json is unchanged. */
export function getPriceOverride(sku?: string | null): number | undefined {
  if (!sku) return undefined;
  const v = overrides[sku];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
}

/** Price shown to the customer. null = show quote CTA. */
export function catalogPrice(sku: string | undefined | null): number | null {
  if (!sku) return null;
  const override = getPriceOverride(sku);
  if (override != null) return override;
  // Override: hide price for severe outliers (source map untouched)
  if (hidden.has(sku)) return null;
  const v = map[sku];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
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
  return Boolean(sku && hidden.has(sku) && getPriceOverride(sku) == null);
}
