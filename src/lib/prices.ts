import pricesBySku from "../../public/catalog/prices.json";

const map = pricesBySku as Record<string, number>;

/** Price from Matan's לאתר sheet, exact numeric as given. null = show quote CTA. */
export function catalogPrice(sku: string | undefined | null): number | null {
  if (!sku) return null;
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
