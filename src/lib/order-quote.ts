import { brand } from "./brand.ts";
import { expandProductName } from "./name-expand.ts";
import { splitOe } from "./part-display.ts";
import { catalogPrice, formatCatalogPrice, priceOrQuoteLabel } from "./prices.ts";

export const PRODUCT_SITE = "https://hezi-orkor.vercel.app";
export const CART_URL = `${PRODUCT_SITE}/cart`;
/** Soft cap for encoded wa.me URLs. ~2000 is conservative; 4000 still stays under common wa.me truncation and leaves room for Hebrew names. */
export const WA_URL_SOFT_LIMIT = 4000;

export type OrderCustomer = {
  name: string;
  phone: string;
  city: string;
  delivery: "pickup" | "delivery" | "";
  plate: string;
  make: string;
  model: string;
  year: string;
  engine: string;
  notes: string;
};

export type OrderLineInput = {
  sku: string;
  name: string;
  qty: number;
  oe?: string;
};

const AFTERMARKET_BRANDS =
  /^(VALEO|BOSCH|MAHLE|MANN|TRW|SACHS|LUK|NGK|DENSO|FEBI|MEYLE|DELPHI|TEXTAR|ATE|BREMBO|GATES|SKF|MOOG|KYB|MONROE|BOGE|BILSTEIN|OPTIMAL|ACDELCO|ASHIKA|SIDAT|LEMFORDER|BLUEPRINT|PAGID|FERODO|JURID|GIRLING|HELLA|NRF|CHAMPION|WIX|FILTRON|COMLINE|SPEEDMATE|EUROMASTER)$/i;

export function normalizeIlPhone(raw: string) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("972")) d = "0" + d.slice(3);
  return d;
}

export function isValidIlPhone(raw: string) {
  const d = normalizeIlPhone(raw);
  return /^05\d{8}$/.test(d) || /^0[2-489]\d{7,8}$/.test(d);
}

export function normalizeIlPlate(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

export function isValidIlPlate(raw: string) {
  const d = normalizeIlPlate(raw);
  return d.length === 7 || d.length === 8;
}

export function formatIlPlate(raw: string) {
  const d = normalizeIlPlate(raw);
  if (d.length === 7) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  if (d.length === 8) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  return raw.trim();
}

export function orderRefNow(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
  return `HZ-ORD-${get("year")}${get("month")}${get("day")}-${get("hour")}${get("minute")}`;
}

export function formatTimestampIl(d = new Date()) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function oeListForMessage(raw?: string, cap = 5) {
  const { oem, aftermarket } = splitOe(raw);
  const all = oem.length ? oem : aftermarket;
  const list = all.slice(0, cap);
  if (!list.length) return "";
  const extra = all.length - list.length;
  return extra > 0 ? `${list.join(" · ")} + עוד ${extra}` : list.join(" · ");
}

export function brandMfgPairs(raw?: string, cap = 3): string[] {
  const tokens = String(raw || "")
    .split(/[\s,;|/•·:：]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const out: string[] = [];
  let brandName = "";
  for (const tok of tokens) {
    const key = tok.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (AFTERMARKET_BRANDS.test(key)) {
      brandName = tok;
      continue;
    }
    if (/^FILTER$/i.test(tok)) continue;
    if (brandName && /[0-9]/.test(tok) && tok.length >= 4) {
      out.push(`${brandName} ${tok}`);
      brandName = "";
      if (out.length >= cap) break;
    }
  }
  return out;
}

export function deliveryLabel(v: OrderCustomer["delivery"], short = false) {
  if (v === "pickup") return short ? "איסוף עצמי, נהריה" : "איסוף עצמי מלוחמי הגטאות 24, נהריה";
  if (v === "delivery") return "משלוח";
  return "—";
}

export function unitPriceLabel(sku: string) {
  const p = catalogPrice(sku);
  return p == null ? priceOrQuoteLabel(sku) : formatCatalogPrice(p);
}

export function lineTotalLabel(sku: string, qty: number) {
  const p = catalogPrice(sku);
  if (p == null) return priceOrQuoteLabel(sku);
  return formatCatalogPrice(p * qty);
}

export function productAbsoluteUrl(sku: string) {
  return `${PRODUCT_SITE}/product/${encodeURIComponent(sku)}`;
}

function displayName(name: string) {
  return expandProductName(name).name || name;
}

function customerHeader(customer: OrderCustomer, now: Date) {
  return [
    "*הזמנה / בקשת הצעת מחיר מהאתר*",
    `מס׳ הזמנה: ${orderRefNow(now)}`,
    `תאריך: ${formatTimestampIl(now)} (Asia/Jerusalem)`,
    "",
    "*לקוח*",
    `שם: ${customer.name.trim()}`,
    `טלפון: ${customer.phone.trim()}`,
    `עיר: ${customer.city.trim() || "—"}`,
    `משלוח/איסוף: ${deliveryLabel(customer.delivery)}`,
    `הערות: ${customer.notes.trim() || "—"}`,
    "",
    "*רכב*",
    `מס׳ רישוי: ${formatIlPlate(customer.plate) || customer.plate.trim()}`,
    `יצרן/דגם/שנה: ${[customer.make, customer.model, customer.year].filter(Boolean).join(" ") || "—"}`,
    `מנוע: ${customer.engine.trim() || "—"}`,
    "",
    "*פריטים*",
  ];
}

function totals(lines: OrderLineInput[]) {
  let subtotal = 0;
  let quoteCount = 0;
  for (const line of lines) {
    const p = catalogPrice(line.sku);
    if (p == null) quoteCount += 1;
    else subtotal += p * line.qty;
  }
  return { subtotal, quoteCount };
}

/** Full per-item block — always same structure for every line. */
function itemBlock(
  line: OrderLineInput,
  index: number,
  oeCap: number,
  brandCap: number,
) {
  const oe = oeListForMessage(line.oe, oeCap);
  const brands = brandMfgPairs(line.oe, brandCap);
  const rows = [
    "────────",
    `${index + 1}. ${displayName(line.name)}`,
    `   מק״ט אצלנו: ${line.sku}`,
  ];
  if (oe) rows.push(`   מק״ט מקורי (OE): ${oe}`);
  if (brands.length) rows.push(`   יצרן/מותג + מק״ט יצרן: ${brands.join(" · ")}`);
  rows.push(
    `   כמות: ${line.qty}`,
    `   מחיר יח׳: ${unitPriceLabel(line.sku)}`,
    `   סה״כ שורה: ${lineTotalLabel(line.sku, line.qty)}`,
    `   קישור: ${productAbsoluteUrl(line.sku)}`,
  );
  return rows.join("\n");
}

export function buildCartOrderMessage(
  customer: OrderCustomer,
  lines: OrderLineInput[],
  opts?: { now?: Date; oeCap?: number; brandCap?: number },
) {
  const now = opts?.now ?? new Date();
  const oeCap = opts?.oeCap ?? 5;
  const brandCap = opts?.brandCap ?? 3;
  const { subtotal, quoteCount } = totals(lines);

  const body = lines.map((line, i) => itemBlock(line, i, oeCap, brandCap));
  const footer = [
    "────────",
    "",
    "*סיכום*",
    `סכום ביניים (פריטים עם מחיר מחירון): ${formatCatalogPrice(subtotal)}`,
    `פריטים בהצעת מחיר: ${quoteCount}`,
    "*המחירים מחירון באתר — אישור התאמה ומחיר סופי אצלכם לפני הזמנה. אין סליקה באתר.*",
  ];

  return [...customerHeader(customer, now), ...body, ...footer].join("\n");
}

/** Last-resort short list when even oeCap=2 still exceeds URL limit. */
export function buildCartOrderMessageSummary(
  customer: OrderCustomer,
  lines: OrderLineInput[],
  opts?: { now?: Date },
) {
  const now = opts?.now ?? new Date();
  const { subtotal, quoteCount } = totals(lines);
  const shortItems = lines.map((line, i) => {
    const name = displayName(line.name);
    const short = name.length > 42 ? `${name.slice(0, 39)}…` : name;
    return `${i + 1}. ${line.sku} × ${line.qty} — ${short} · ${unitPriceLabel(line.sku)}`;
  });
  return [
    ...customerHeader(customer, now),
    ...shortItems,
    "",
    `רשימה מלאה בקישור: ${CART_URL}`,
    "",
    "*סיכום*",
    `סכום ביניים (פריטים עם מחיר מחירון): ${formatCatalogPrice(subtotal)}`,
    `פריטים בהצעת מחיר: ${quoteCount}`,
    "*המחירים מחירון באתר — אישור התאמה ומחיר סופי אצלכם לפני הזמנה. אין סליקה באתר.*",
  ].join("\n");
}

export function buildQuickQuoteMessage(product: { sku: string; name: string; oe?: string }) {
  const oe = oeListForMessage(product.oe, 5);
  const brands = brandMfgPairs(product.oe, 2);
  const lines = [
    `שלום, אשמח להצעת מחיר ולבירור מלאי עבור:`,
    displayName(product.name),
    `מק״ט אצלנו: ${product.sku}`,
  ];
  if (oe) lines.push(`מק״ט מקורי (OE): ${oe}`);
  if (brands.length) lines.push(`יצרן/מותג + מק״ט יצרן: ${brands.join(" · ")}`);
  lines.push(
    `מחיר יח׳: ${unitPriceLabel(product.sku)}`,
    `קישור: ${productAbsoluteUrl(product.sku)}`,
    "",
    "אשמח שתשלחו גם מספר רישוי של הרכב לאישור התאמה.",
  );
  return lines.join("\n");
}


export type OrderShareTextInput = {
  orderRef: string;
  customer: OrderCustomer;
  lines: OrderLineInput[];
  subtotal: number;
  quoteCount?: number;
  /** Durable view/download URL, if the order was stored server-side. */
  pdfUrl?: string;
  /** True only when this text is sent together with a PDF file via Web Share. */
  pdfAttached?: boolean;
};

function shortName(name: string, max: number) {
  const n = displayName(name);
  if (max <= 0) return "";
  if (n.length <= max) return n;
  return `${n.slice(0, Math.max(1, max - 1))}…`;
}

function compactItemLine(line: OrderLineInput, index: number, nameMax: number) {
  const unit = unitPriceLabel(line.sku);
  const total = lineTotalLabel(line.sku, line.qty);
  const p = catalogPrice(line.sku);
  const name = shortName(line.name, nameMax);
  const namePart = name ? ` ${name}` : "";
  if (p == null) return `${index + 1}. ${line.sku}${namePart} ×${line.qty} — ${unit}`;
  return `${index + 1}. ${line.sku}${namePart} ×${line.qty} — ${unit} / ${total}`;
}

function composeShareText(
  opts: OrderShareTextInput & { nameMax: number; includeVehicle: boolean; includeNotes: boolean },
) {
  const { orderRef, customer, lines, subtotal, pdfUrl, pdfAttached, nameMax } = opts;
  const quoteCount = opts.quoteCount ?? lines.filter((l) => catalogPrice(l.sku) == null).length;
  const rows = [
    `הזמנה ${orderRef}`,
    `שם: ${customer.name.trim()}`,
    `טלפון: ${customer.phone.trim()}`,
    `מס׳ רישוי: ${formatIlPlate(customer.plate) || customer.plate.trim()}`,
    `משלוח: ${deliveryLabel(customer.delivery, true)}`,
  ];
  if (customer.city.trim()) rows.push(`עיר: ${customer.city.trim()}`);
  if (opts.includeVehicle) {
    const veh = [customer.make, customer.model, customer.year].filter(Boolean).join(" ");
    if (veh) rows.push(`רכב: ${veh}`);
    if (customer.engine.trim()) rows.push(`מנוע: ${customer.engine.trim()}`);
  }
  if (opts.includeNotes && customer.notes.trim()) rows.push(`הערות: ${customer.notes.trim()}`);
  rows.push("", "פריטים:");
  lines.forEach((line, i) => rows.push(compactItemLine(line, i, nameMax)));
  rows.push("", `סכום ביניים: ${formatCatalogPrice(subtotal)}`);
  if (quoteCount) rows.push(`פריטים ללא מחיר מחירון: ${quoteCount}`);
  if (pdfUrl) rows.push(`PDF: ${pdfUrl}`);
  if (pdfAttached) rows.push("קובץ PDF צורף לשיתוף");
  rows.push("המחירים מחירון באתר — אישור סופי אצלכם. אין סליקה באתר.");
  return rows.join("\n");
}

export type OrderShareFit = {
  text: string;
  url: string;
  /** Encoded wa.me URL length. */
  urlLength: number;
  overLimit: boolean;
};

/**
 * Compact WhatsApp order text that lists every line (SKU, short name, qty, unit, line total).
 * Fits encoded wa.me URLs under WA_URL_SOFT_LIMIT when possible; never drops line items.
 * Does not claim a PDF is attached unless pdfAttached or pdfUrl is set.
 */
export function buildOrderShareMessage(opts: OrderShareTextInput): OrderShareFit {
  const attempts: Array<{ nameMax: number; includeVehicle: boolean; includeNotes: boolean }> = [
    { nameMax: 36, includeVehicle: true, includeNotes: true },
    { nameMax: 24, includeVehicle: true, includeNotes: false },
    { nameMax: 16, includeVehicle: false, includeNotes: false },
    { nameMax: 8, includeVehicle: false, includeNotes: false },
    { nameMax: 0, includeVehicle: false, includeNotes: false },
  ];
  let last: OrderShareFit | null = null;
  for (const a of attempts) {
    const text = composeShareText({ ...opts, ...a });
    const url = waLinkForText(text);
    last = { text, url, urlLength: url.length, overLimit: url.length > WA_URL_SOFT_LIMIT };
    if (!last.overLimit) return last;
  }
  return last!;
}

export function waLinkForText(text: string) {
  return `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(text)}`;
}

export type OrderMessageFit = {
  text: string;
  url: string;
  /** oeCap used for full-format attempts */
  oeCap: number;
  brandCap: number;
  /** true when fell back to short list + cart link */
  summaryFallback: boolean;
};

/**
 * Prefer full item format for EVERY line.
 * Fit length by lowering OE/brand caps uniformly: 5/3 → 3/2 → 2/2.
 * Only if still too long: summary list + cart link.
 */
export function buildCartOrderMessageFitting(
  customer: OrderCustomer,
  lines: OrderLineInput[],
  now?: Date,
): OrderMessageFit {
  const caps: Array<{ oeCap: number; brandCap: number }> = [
    { oeCap: 5, brandCap: 3 },
    { oeCap: 3, brandCap: 2 },
    { oeCap: 2, brandCap: 2 },
  ];

  let last: OrderMessageFit = {
    text: "",
    url: "",
    oeCap: 2,
    brandCap: 2,
    summaryFallback: false,
  };

  for (const c of caps) {
    const text = buildCartOrderMessage(customer, lines, { now, ...c });
    const url = waLinkForText(text);
    last = { text, url, oeCap: c.oeCap, brandCap: c.brandCap, summaryFallback: false };
    if (url.length <= WA_URL_SOFT_LIMIT) return last;
  }

  const text = buildCartOrderMessageSummary(customer, lines, { now });
  const url = waLinkForText(text);
  return { text, url, oeCap: 0, brandCap: 0, summaryFallback: true };
}

/** Smallest N where summary fallback is required for a typical cart (experimental helper). */
export function findSummaryFallbackThreshold(
  customer: OrderCustomer,
  sampleLine: OrderLineInput,
  maxN = 40,
) {
  for (let n = 1; n <= maxN; n++) {
    const lines = Array.from({ length: n }, (_, i) => ({
      ...sampleLine,
      sku: sampleLine.sku,
      name: `${sampleLine.name} #${i + 1}`,
    }));
    const fit = buildCartOrderMessageFitting(customer, lines);
    if (fit.summaryFallback) return n;
  }
  return null;
}

export function emptyOrderCustomer(): OrderCustomer {
  return {
    name: "",
    phone: "",
    city: "",
    delivery: "",
    plate: "",
    make: "",
    model: "",
    year: "",
    engine: "",
    notes: "",
  };
}
