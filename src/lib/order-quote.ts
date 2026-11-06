import { brand } from "@/lib/brand";
import { splitOe } from "@/lib/part-display";
import { catalogPrice, formatCatalogPrice } from "@/lib/prices";

export const PRODUCT_SITE = "https://hezi-orkor.vercel.app";
/** Soft cap for wa.me URLs (WhatsApp commonly truncates around ~2000–4000). */
export const WA_URL_SOFT_LIMIT = 6000;

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

/** Israeli mobile/landline → digits only, optional leading 0 or 972. */
export function normalizeIlPhone(raw: string) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("972")) d = "0" + d.slice(3);
  return d;
}

export function isValidIlPhone(raw: string) {
  const d = normalizeIlPhone(raw);
  // Mobile 05x-xxxxxxx (10 digits) or landline 0[2-9]-xxxxxxx (9–10)
  return /^05\d{8}$/.test(d) || /^0[2-489]\d{7,8}$/.test(d);
}

/** IL plates: 7 or 8 digits, optional dashes/spaces. */
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
  const y = get("year");
  const m = get("month");
  const day = get("day");
  const h = get("hour");
  const min = get("minute");
  return `HZ-ORD-${y}${m}${day}-${h}${min}`;
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
  const list = (oem.length ? oem : aftermarket).slice(0, cap);
  const total = (oem.length ? oem : aftermarket).length;
  if (!list.length) return "";
  const extra = total - list.length;
  return extra > 0 ? `${list.join(" · ")} + עוד ${extra}` : list.join(" · ");
}

/** Brand + manufacturer P/N pairs from OE blob (aftermarket brands only). */
export function brandMfgPairs(raw?: string, cap = 3): string[] {
  const tokens = String(raw || "")
    .split(/[\s,;|/•·:：]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const out: string[] = [];
  let brandName = "";
  for (const tok of tokens) {
    const key = tok.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (AFTERMARKET_BRANDS.test(key) || /^MAHLE$/i.test(tok)) {
      brandName = tok.toUpperCase() === "FILTER" ? brandName : tok;
      if (/^FILTER$/i.test(tok) && brandName) continue;
      continue;
    }
    if (brandName && /[0-9]/.test(tok) && tok.length >= 4) {
      out.push(`${brandName} ${tok}`);
      brandName = "";
      if (out.length >= cap) break;
    }
  }
  // Also catch "MAHLE FILTER OX416"
  if (!out.length && /MAHLE/i.test(raw || "")) {
    const m = String(raw).match(/MAHLE(?:\s+FILTER)?\s+([A-Z0-9][A-Z0-9.\-]{2,})/i);
    if (m) out.push(`MAHLE ${m[1]}`);
  }
  return out;
}

function deliveryLabel(v: OrderCustomer["delivery"]) {
  if (v === "pickup") return "איסוף עצמי מלוחמי הגטאות 24, נהריה";
  if (v === "delivery") return "משלוח";
  return "—";
}

function unitPriceLabel(sku: string) {
  const p = catalogPrice(sku);
  return p == null ? "הצעת מחיר" : formatCatalogPrice(p);
}

function lineTotalLabel(sku: string, qty: number) {
  const p = catalogPrice(sku);
  if (p == null) return "הצעת מחיר";
  return formatCatalogPrice(p * qty);
}

export function productAbsoluteUrl(sku: string) {
  return `${PRODUCT_SITE}/product/${encodeURIComponent(sku)}`;
}

export function buildCartOrderMessage(
  customer: OrderCustomer,
  lines: OrderLineInput[],
  opts?: { compact?: boolean; now?: Date; dropBrands?: boolean; dropLinks?: boolean },
) {
  const now = opts?.now ?? new Date();
  const compact = Boolean(opts?.compact);
  const dropBrands = Boolean(opts?.dropBrands);
  const dropLinks = Boolean(opts?.dropLinks);
  const oeCap = compact ? 3 : 5;
  const brandCap = compact ? 2 : 3;

  let subtotal = 0;
  let quoteCount = 0;
  for (const line of lines) {
    const p = catalogPrice(line.sku);
    if (p == null) quoteCount += 1;
    else subtotal += p * line.qty;
  }

  const header = [
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

  const itemBlocks = lines.map((line, i) => {
    const oe = oeListForMessage(line.oe, oeCap);
    const brands = brandMfgPairs(line.oe, brandCap);
    const rows = [
      "────────",
      `${i + 1}. ${line.name}`,
      `   מק״ט אצלנו: ${line.sku}`,
    ];
    if (oe) rows.push(`   מק״ט מקורי (OE): ${oe}`);
    if (!dropBrands && brands.length) rows.push(`   יצרן/מותג + מק״ט יצרן: ${brands.join(" · ")}`);
    rows.push(
      `   כמות: ${line.qty}`,
      `   מחיר יח׳: ${unitPriceLabel(line.sku)}`,
      `   סה״כ שורה: ${lineTotalLabel(line.sku, line.qty)}`,
    );
    if (!dropLinks) rows.push(`   קישור: ${productAbsoluteUrl(line.sku)}`);
    return rows.join("\n");
  });

  const footer = [
    "────────",
    "",
    "*סיכום*",
    `סכום ביניים (פריטים עם מחיר מחירון): ${formatCatalogPrice(subtotal)}`,
    `פריטים בהצעת מחיר: ${quoteCount}`,
    dropLinks ? `קישורי מוצרים: ${PRODUCT_SITE}/product/{מק״ט}` : "",
    "*המחירים מחירון באתר — אישור התאמה ומחיר סופי אצלכם לפני הזמנה. אין סליקה באתר.*",
  ].filter(Boolean);

  return [...header, ...itemBlocks, ...footer].join("\n");
}

/** Single-product quick quote — OE + link; asks for plate when no form. */
export function buildQuickQuoteMessage(product: { sku: string; name: string; oe?: string }) {
  const oe = oeListForMessage(product.oe, 5);
  const brands = brandMfgPairs(product.oe, 3);
  const lines = [
    `שלום, אשמח להצעת מחיר ולבירור מלאי עבור:`,
    product.name,
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

export function waLinkForText(text: string) {
  return `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(text)}`;
}

export type OrderMessageFit = {
  text: string;
  url: string;
  compact: boolean;
  truncated: boolean;
};

/** Shrink message until wa.me URL is under soft limit (WhatsApp truncates long URLs). */
export function buildCartOrderMessageFitting(
  customer: OrderCustomer,
  lines: OrderLineInput[],
  now?: Date,
): OrderMessageFit {
  const attempts: Array<{ compact: boolean; dropBrands: boolean; dropLinks: boolean; short: boolean }> = [
    { compact: false, dropBrands: false, dropLinks: false, short: false },
    { compact: true, dropBrands: false, dropLinks: false, short: false },
    { compact: true, dropBrands: true, dropLinks: false, short: false },
    { compact: true, dropBrands: true, dropLinks: false, short: true },
    { compact: true, dropBrands: true, dropLinks: true, short: true },
  ];

  let last = { text: "", url: "", compact: true, truncated: true };
  for (const a of attempts) {
    const cust = a.short
      ? { ...customer, notes: customer.notes.slice(0, 60), city: customer.city.slice(0, 24) }
      : customer;
    const ls = a.short
      ? lines.map((l) => ({
          ...l,
          name: l.name.length > 40 ? `${l.name.slice(0, 37)}…` : l.name,
          // Keep raw OE; compact oeCap already limits token count (avoid mid-token cuts).
        }))
      : lines;
    const text = buildCartOrderMessage(cust, ls, {
      now,
      compact: a.compact,
      dropBrands: a.dropBrands,
      dropLinks: a.dropLinks,
    });
    const url = waLinkForText(text);
    last = { text, url, compact: a.compact, truncated: a.dropLinks || a.short || a.dropBrands };
    if (url.length <= WA_URL_SOFT_LIMIT) return { ...last, truncated: last.truncated };
  }
  return last;
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
