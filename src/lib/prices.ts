import pricesBySku from "../../public/catalog/prices.json" with { type: "json" };
import priceHideOverrides from "../../public/catalog/price-hide-overrides.json" with { type: "json" };
import priceOverrides from "../../public/catalog/price-overrides.json" with { type: "json" };
import { isWorkshopPackSku } from "./display-taxonomy.ts";
import { overlayPrice, overlayPriceHidden } from "./admin/public-overlay.ts";

const map = pricesBySku as Record<string, number>;
const hidden = new Set(
  (priceHideOverrides as { skus?: string[] }).skus?.filter(Boolean) ?? [],
);
const overrides = ((priceOverrides as { bySku?: Record<string, number> }).bySku || {}) as Record<
  string,
  number
>;

export const WORKSHOP_PACK_PRICE_LABEL = "מחיר מיוחד למוסכים וספקים";

/**
 * Ceiling to a whole shekel for display and cart math.
 * Rounds to 2 decimals first so 45.0000001 stays 45, then ceils (45.1 → 46, 45.0 → 45).
 */
export function ceilShekel(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return value;
  const cents = Math.round((value + Number.EPSILON) * 100);
  return Math.ceil(cents / 100 - 1e-12);
}

function rawCatalogPrice(sku: string): number | null {
  const live = overlayPrice(sku);
  if (typeof live === "number") return live;
  const override = overrides[sku];
  if (typeof override === "number" && Number.isFinite(override) && override > 0) return override;
  if (overlayPriceHidden(sku) || hidden.has(sku)) return null;
  const v = map[sku];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

/** Display WJS / sale-price override when present. Source prices.json is unchanged. */
export function getPriceOverride(sku?: string | null): number | undefined {
  if (!sku) return undefined;
  const live = overlayPrice(sku);
  if (typeof live === "number") return live;
  const v = overrides[sku];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
}

/**
 * Price shown to the customer (already ceiled to a whole shekel).
 * null = quote CTA, or a workshop-pack (special label, no numeric price).
 */
export function catalogPrice(sku: string | undefined | null): number | null {
  if (!sku) return null;
  if (isWorkshopPackSku(sku)) return null;
  const raw = rawCatalogPrice(sku);
  return raw == null ? null : ceilShekel(raw);
}

/** Format a customer-facing amount — whole shekels, no forced decimals. */
export function formatCatalogPrice(value: number): string {
  const n = Number.isInteger(value) ? value : ceilShekel(value);
  return `${String(n)} ₪`;
}

export function priceOrQuoteLabel(sku: string | undefined | null): string {
  if (isWorkshopPackSku(sku)) return WORKSHOP_PACK_PRICE_LABEL;
  const p = catalogPrice(sku);
  return p == null ? "צור קשר להצעת מחיר" : formatCatalogPrice(p);
}

export function hasCatalogPrice(sku: string | undefined | null): boolean {
  return catalogPrice(sku) != null;
}

export function isPriceHiddenOverride(sku: string | undefined | null): boolean {
  return Boolean(sku && hidden.has(sku) && getPriceOverride(sku) == null && !isWorkshopPackSku(sku));
}
