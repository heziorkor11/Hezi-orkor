import {
  emptyPublicState,
  type PublicAdminState,
  type Promotion,
  type ProductOverride,
} from "./types";
let snapshot: PublicAdminState = emptyPublicState();
export function adminSnapshot() {
  return snapshot;
}
export function adminProductOverride(sku: string): ProductOverride | undefined {
  return snapshot.products[sku];
}
export function adoptAdminOverlay(state: PublicAdminState) {
  snapshot = state;
}
let inFlight: Promise<PublicAdminState> | undefined;
let fetchedAt = 0;
let sequence = 0;
export async function refreshAdminOverlay(force = false): Promise<PublicAdminState> {
  if (typeof window === "undefined") {
    if (
      typeof process === "undefined" ||
      process.env.ADMIN_LOCAL_ENABLED !== "1" ||
      process.env.ADMIN_STORAGE !== "local" ||
      process.env.VERCEL
    )
      return (snapshot = emptyPublicState());
    try {
      const { readFile } = await import("node:fs/promises");
      const { resolve, join } = await import("node:path");
      const s = JSON.parse(
        await readFile(
          join(resolve(process.env.ADMIN_DATA_DIR || ".data/admin"), "state.json"),
          "utf8",
        ),
      );
      snapshot = {
        enabled: true,
        revision: s.revision,
        products: s.products,
        promotions: s.promotions,
        home: s.home,
      };
    } catch (e) {
      if ((e as { code?: string }).code === "ENOENT")
        snapshot = { ...emptyPublicState(), enabled: true };
      else throw e;
    }
  } else {
    if (inFlight && !force) return inFlight;
    if (!force && Date.now() - fetchedAt < 250) return snapshot;
    const seq = ++sequence;
    const pending = fetch("/api/admin/storefront", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("לא ניתן לטעון עדכוני ניהול");
        const next = (await r.json()) as PublicAdminState;
        if (seq === sequence) {
          snapshot = next;
          fetchedAt = Date.now();
        }
        return snapshot;
      })
      .finally(() => {
        if (seq === sequence) inFlight = undefined;
      });
    inFlight = pending;
    return pending;
  }
  return snapshot;
}
export function explicitBrand(name: string) {
  return (
    name
      .match(
        /\b(MOTUL|TOTAL|NGK|DENSO|BOSCH|MAHLE|MANNOL|CASTROL|MOBIL|PREFIX|KYB|SACHS|SKF|INA|BREMBO|VALEO|TRW|FEBI|LPR)\b/i,
      )?.[0]
      .toUpperCase() || ""
  );
}
export function activePromotions(now = Date.now(), state = snapshot) {
  return state.promotions.filter(
    (p) => p.enabled && Date.parse(p.start) <= now && Date.parse(p.end) > now,
  );
}
export function promotionFor(
  sku: string,
  category: string,
  brand: string,
  now = Date.now(),
  state = snapshot,
): Promotion | undefined {
  return activePromotions(now, state).find((p) =>
    p.targetType === "product"
      ? p.target === sku
      : p.targetType === "category"
        ? p.target === category
        : p.target.toUpperCase() === brand.toUpperCase(),
  );
}
export function effectivePrice(
  sku: string,
  base: number | null,
  category: string,
  brand: string,
  state = snapshot,
  now = Date.now(),
) {
  const o = state.products[sku];
  const regular = o && Object.hasOwn(o, "price") ? (o.price ?? null) : base;
  const promo = promotionFor(sku, o?.category || category, o?.brand ?? brand, now, state);
  if (regular == null || !promo) return { price: regular, regular, promo: undefined };
  const value = promo.kind === "percent" ? regular * (1 - promo.value / 100) : promo.value;
  // Promotions must not silently increase a regular price.
  return value < regular
    ? { price: Math.round(value * 100) / 100, regular, promo }
    : { price: regular, regular, promo: undefined };
}
