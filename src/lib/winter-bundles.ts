/**
 * חבילות טיפול חורף — config-driven promo (src/lib/winter-bundles.json).
 * No discount: a bundle's price is always the live sum of catalogPrice() × qty of its items.
 * The cart receives the items as regular SKUs, so cart / WhatsApp / PDF / order totals are unchanged.
 */
import config from "./winter-bundles.json" with { type: "json" };
import { catalogPrice } from "./prices.ts";

export type WinterBundleItem = { sku: string; qty: number };
export type WinterBundle = {
  id: string;
  label: string;
  title: string;
  vehicle: string;
  shortVehicle: string;
  items: WinterBundleItem[];
};
export type WinterPromoConfig = {
  enabled: boolean;
  startAt: string;
  endAt: string;
  title: string;
  kicker: string;
  subtitle: string;
  bundles: WinterBundle[];
};

export const winterPromo = config as WinterPromoConfig;
export const WINTER_BUNDLE_BADGE = "בחבילת טיפול חורף";

type PriceFn = (sku: string) => number | null;

function instant(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Number.NaN;
}

/** Active only when enabled, both bounds parse, and startAt <= now <= endAt. */
export function isWinterPromoActive(
  now: Date = new Date(),
  cfg: WinterPromoConfig = winterPromo,
): boolean {
  if (!cfg.enabled) return false;
  const start = instant(cfg.startAt);
  const end = instant(cfg.endAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  const t = now.getTime();
  return t >= start && t <= end;
}

/** Live bundle total = Σ catalogPrice × qty. null when any item has no numeric price (quote / hidden). */
export function bundleTotal(bundle: WinterBundle, priceFor: PriceFn = catalogPrice): number | null {
  if (!bundle.items.length) return null;
  let sum = 0;
  for (const item of bundle.items) {
    const p = priceFor(item.sku);
    if (p == null || !Number.isFinite(p) || p <= 0) return null;
    sum += p * Math.max(1, Math.floor(item.qty || 1));
  }
  return sum;
}

/** Bundles that can be shown: active promo and every item priced. */
export function visibleWinterBundles(
  now: Date = new Date(),
  cfg: WinterPromoConfig = winterPromo,
  priceFor: PriceFn = catalogPrice,
): WinterBundle[] {
  if (!isWinterPromoActive(now, cfg)) return [];
  return cfg.bundles.filter((b) => bundleTotal(b, priceFor) != null);
}

export function winterBundleSkus(cfg: WinterPromoConfig = winterPromo): string[] {
  return [...new Set(cfg.bundles.flatMap((b) => b.items.map((i) => i.sku)))];
}

/** Visible bundles that include this SKU (for the product badge). */
export function winterBundlesForSku(
  sku: string | undefined | null,
  now: Date = new Date(),
  cfg: WinterPromoConfig = winterPromo,
  priceFor: PriceFn = catalogPrice,
): WinterBundle[] {
  if (!sku) return [];
  return visibleWinterBundles(now, cfg, priceFor).filter((b) => b.items.some((i) => i.sku === sku));
}

/** Cart adds for "הוסף חבילה לסל": regular SKU lines with the bundle quantities. */
export function bundleCartAdds(bundle: WinterBundle): WinterBundleItem[] {
  return bundle.items.map((i) => ({ sku: i.sku, qty: Math.max(1, Math.floor(i.qty || 1)) }));
}

export type PromoCountdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

export function promoCountdown(
  now: Date = new Date(),
  cfg: WinterPromoConfig = winterPromo,
): PromoCountdown {
  const end = instant(cfg.endAt);
  const ms = Number.isNaN(end) ? 0 : end - now.getTime();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    expired: false,
  };
}
