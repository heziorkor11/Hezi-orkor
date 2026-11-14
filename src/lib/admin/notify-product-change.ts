/**
 * Hook for the Sheets/export worker (Apps Script web app).
 * No-ops unless SHEETS_SYNC_URL is set. When set, POSTs JSON with
 * mode:"upsert" and the shared secret in the body field `secret`
 * (from SHEETS_SYNC_SECRET). Apps Script cannot read custom headers.
 * Never log the secret. Fire-and-forget; never throw to the caller.
 */

export type ProductChange = {
  action?: "add" | "edit" | "price" | "image" | "tag" | "hide" | "stock" | "category" | "revert";
  sku?: string;
  name?: string;
  category?: string;
  subType?: string;
  fitment?: string;
  priceDisplayed?: number | string;
  basePrice?: number | string;
  image?: string;
  hasImage?: boolean;
  tags?: string;
  stock?: string;
  visibility?: "מוצג" | "מוסתר" | string;
  link?: string;
  updatedBy?: string;
  updatedAt?: string;
  actor?: string;
  fields?: string[];
  hidden?: boolean;
};

const ENRICH_KEYS = [
  "name",
  "category",
  "subType",
  "fitment",
  "priceDisplayed",
  "basePrice",
  "image",
  "hasImage",
  "tags",
  "stock",
  "visibility",
  "link",
] as const;

export function sheetsHookConfigured(): boolean {
  return Boolean((process.env.SHEETS_SYNC_URL || "").trim());
}

export function actionForFields(fields: string[]): NonNullable<ProductChange["action"]> {
  if (fields.length === 1) {
    const only = fields[0];
    if (only === "price") return "price";
    if (only === "image") return "image";
    if (only === "tags") return "tag";
    if (only === "hidden") return "hide";
    if (only === "stock") return "stock";
    if (only === "category") return "category";
  }
  return "edit";
}

export function changeFromFields(fields: string[], rest: Omit<ProductChange, "action" | "fields"> = {}): ProductChange {
  return { ...rest, action: actionForFields(fields), fields };
}

export function needsEnrichment(change: ProductChange): boolean {
  return Boolean(change.sku) && ENRICH_KEYS.some((key) => change[key] === undefined);
}

function formatJerusalemStamp(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${g("day")}.${g("month")}.${g("year")} ${g("hour")}:${g("minute")}`;
}

function upsertBody(change: ProductChange, secret: string) {
  return {
    secret,
    mode: "upsert" as const,
    sku: change.sku,
    name: change.name,
    category: change.category,
    subType: change.subType ?? "",
    fitment: change.fitment ?? "",
    priceDisplayed: change.priceDisplayed ?? "",
    basePrice: change.basePrice ?? "",
    image: change.image ?? "",
    hasImage: Boolean(change.hasImage),
    tags: change.tags ?? "",
    stock: change.stock ?? "",
    visibility: change.visibility ?? (change.hidden ? "מוסתר" : "מוצג"),
    link: change.link ?? "",
    updatedBy: change.updatedBy || change.actor || "",
    updatedAt: change.updatedAt || formatJerusalemStamp(),
  };
}

async function deliver(change: ProductChange): Promise<void> {
  const url = (process.env.SHEETS_SYNC_URL || "").trim();
  if (!url) return;
  const secret = (process.env.SHEETS_SYNC_SECRET || "").trim();
  let payload: ProductChange = { ...change };
  if (needsEnrichment(payload)) {
    try {
      const { enrichProductChange } = await import("./notify-product-change.server");
      payload = await enrichProductChange(payload);
    } catch (err) {
      console.warn("[admin] product-change enrich failed", err instanceof Error ? err.message : "error");
    }
  }
  if (!payload.sku) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(upsertBody(payload, secret)),
      signal: AbortSignal.timeout(2500),
    });
  } catch (err) {
    console.warn("[admin] product-change hook failed", err instanceof Error ? err.message : "error");
  }
}

/** Fire-and-forget. Never throws; callers must not await this to keep dashboard saves unblocked. */
export function notifyProductChange(change: ProductChange): void {
  void deliver(change);
}

/** Test helper: same work as notifyProductChange, but awaitable. */
export async function flushProductChange(change: ProductChange): Promise<void> {
  await deliver(change);
}
