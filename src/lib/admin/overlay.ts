import { adminRuntimeMode, adminRuntimeDirectory } from "./config";
import {
  emptyPublicState,
  type PublicAdminState,
  type Promotion,
  type ProductOverride,
} from "./types";
let snapshot: PublicAdminState = emptyPublicState();
const listeners = new Set<() => void>();
function storageChanged(event: StorageEvent) {
  if (event.key === "hezi-admin-demo-public-edits-v1" && snapshot.mode === "preview-demo") {
    receipts = undefined;
    publish(snapshot);
  }
}
export function subscribeAdminOverlay(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined")
    window.addEventListener("storage", storageChanged);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && typeof window !== "undefined")
      window.removeEventListener("storage", storageChanged);
  };
}
type DemoReceipts = {
  products: PublicAdminState["products"];
  promotions: PublicAdminState["promotions"];
  home?: PublicAdminState["home"];
  at: number;
};
let receipts: DemoReceipts | undefined;
function demoReceipts() {
  if (!receipts) {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem("hezi-admin-demo-public-edits-v1") || "null",
      );
      if (
        saved &&
        Date.now() - saved.at < 8 * 3600_000 &&
        saved.products &&
        Array.isArray(saved.promotions)
      )
        receipts = saved;
    } catch {
      /* memory-only fallback */
    }
    receipts ||= { products: {}, promotions: [], at: Date.now() };
  }
  return receipts;
}
function withDemoReceipts(state: PublicAdminState): PublicAdminState {
  if (typeof window === "undefined" || state.mode !== "preview-demo" || !state.enabled)
    return state;
  const edits = demoReceipts();
  const products = { ...state.products };
  for (const [sku, patch] of Object.entries(edits.products))
    products[sku] = { ...products[sku], ...patch };
  const promos = new Map(state.promotions.map((p) => [p.id, p]));
  for (const p of edits.promotions) promos.set(p.id, p);
  return { ...state, products, promotions: [...promos.values()], home: edits.home || state.home };
}
function publish(state: PublicAdminState, notify = true) {
  // Render-time root loader adoption must not roll back a fresher local projection.
  if (
    typeof window !== "undefined" &&
    state.enabled &&
    snapshot.enabled &&
    state.mode === snapshot.mode &&
    state.revision < snapshot.revision
  )
    state = snapshot;
  const next = withDemoReceipts(state);
  if (JSON.stringify(next) === JSON.stringify(snapshot)) return;
  snapshot = next;
  if (notify) for (const listener of listeners) listener();
}
/** Public write receipt from the SAME handler that committed the edit. No auth data. */
export function publishAdminMutation(path: string, state: PublicAdminState) {
  if (typeof window !== "undefined" && state.enabled && state.mode === "preview-demo") {
    const edits = demoReceipts();
    if (path.startsWith("products/")) {
      const sku = decodeURIComponent(path.split("/")[1]);
      if (state.products[sku])
        edits.products[sku] = { ...edits.products[sku], ...state.products[sku] };
    } else if (path === "promotions") {
      const map = new Map(edits.promotions.map((p) => [p.id, p]));
      for (const p of state.promotions) map.set(p.id, p);
      edits.promotions = [...map.values()];
    } else if (path === "homepage") edits.home = state.home;
    edits.at = Date.now();
    try {
      window.localStorage.setItem("hezi-admin-demo-public-edits-v1", JSON.stringify(edits));
    } catch {
      /* memory-only fallback */
    }
  }
  publish(state);
}
export function adminSnapshot() {
  return snapshot;
}
export function adminProductOverride(sku: string): ProductOverride | undefined {
  return snapshot.products[sku];
}
export function adoptAdminOverlay(state: PublicAdminState) {
  publish(state, false);
}
let inFlight: Promise<PublicAdminState> | undefined;
let fetchedAt = 0;
let sequence = 0;
export async function refreshAdminOverlay(force = false): Promise<PublicAdminState> {
  if (typeof window === "undefined") {
    const mode = adminRuntimeMode();
    if (mode === "disabled") return (snapshot = emptyPublicState());
    if (mode === "git") {
      const { readGitOverlay } = await import("./git-overlay");
      return (snapshot = await readGitOverlay());
    }
    try {
      const { readFile } = await import("node:fs/promises");
      const { resolve, join } = await import("node:path");
      const s = JSON.parse(
        await readFile(join(resolve(adminRuntimeDirectory()), "state.json"), "utf8"),
      );
      snapshot = {
        mode,
        enabled: true,
        revision: s.revision,
        products: s.products,
        promotions: s.promotions,
        home: s.home,
      };
    } catch (e) {
      if ((e as { code?: string }).code === "ENOENT")
        snapshot = { ...emptyPublicState(), mode, enabled: true };
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
          publish(next);
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
