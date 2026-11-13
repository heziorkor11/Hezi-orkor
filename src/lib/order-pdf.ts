import bidiFactory from "bidi-js";
import { brand } from "@/lib/brand";
import { expandProductName } from "@/lib/name-expand";
import { splitOe } from "@/lib/part-display";
import {
  brandMfgPairs,
  formatIlPlate,
  formatTimestampIl,
  orderRefNow,
  productAbsoluteUrl,
  type OrderCustomer,
  type OrderLineInput,
} from "@/lib/order-quote";
import { catalogPrice, formatCatalogPrice, priceOrQuoteLabel } from "@/lib/prices";

const FONT_REGULAR_URL = "/fonts/Heebo-Regular.ttf";
const FONT_BOLD_URL = "/fonts/Heebo-Bold.ttf";
const LOGO_URL = "/brand/logo.jpg";

const ACCENT = "#e23b12";
const FG = "#111111";
const MUTED = "#666666";
const LINE = "#e5e5e0";
const PAPER = "#f7f7f5";
const CARD = "#ffffff";

const DISCLAIMER =
  "המחירים מחירון באתר — אישור התאמה ומחיר סופי אצלכם לפני הזמנה. אין סליקה באתר.";

export type OrderPdfInput = {
  customer: OrderCustomer;
  lines: OrderLineInput[];
  now?: Date;
  orderRef?: string;
};

export type OrderPdfAssets = {
  fontRegularB64: string;
  fontBoldB64: string;
  logoDataUrl: string | null;
};

type JsPdfCtor = typeof import("jspdf").jsPDF;
type JsPdfDoc = InstanceType<JsPdfCtor>;

let assetsPromise: Promise<OrderPdfAssets> | null = null;
let cachedAssets: OrderPdfAssets | null = null;
let jspdfPromise: Promise<JsPdfCtor> | null = null;
function arrayBufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function bytesToBase64(bytes: Uint8Array) {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  // btoa in browser; in Node use Buffer
  if (typeof btoa === "function") return btoa(binary);
  return Buffer.from(bytes).toString("base64");
}

async function fetchAsArrayBuffer(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.arrayBuffer();
}

async function fetchLogoDataUrl(url: string): Promise<string | null> {
  try {
    const buf = await fetchAsArrayBuffer(url);
    const b64 = arrayBufferToBase64(buf);
    return `data:image/jpeg;base64,${b64}`;
  } catch {
    return null;
  }
}

/** Browser: fetch fonts + logo. Safe to call on cart open. */
export function preloadOrderPdfAssets(): Promise<OrderPdfAssets> {
  if (cachedAssets) return Promise.resolve(cachedAssets);
  if (!assetsPromise) {
    assetsPromise = (async () => {
      const [reg, bold, logoDataUrl] = await Promise.all([
        fetchAsArrayBuffer(FONT_REGULAR_URL),
        fetchAsArrayBuffer(FONT_BOLD_URL),
        fetchLogoDataUrl(LOGO_URL),
      ]);
      const assets: OrderPdfAssets = {
        fontRegularB64: arrayBufferToBase64(reg),
        fontBoldB64: arrayBufferToBase64(bold),
        logoDataUrl,
      };
      cachedAssets = assets;
      return assets;
    })().catch((err) => {
      assetsPromise = null;
      throw err;
    });
  }
  return assetsPromise;
}

/** Node / tests: inject font bytes + optional logo data URL. */
export function setOrderPdfAssetsFromBytes(opts: {
  fontRegular: Uint8Array;
  fontBold: Uint8Array;
  logoDataUrl?: string | null;
}) {
  cachedAssets = {
    fontRegularB64: bytesToBase64(opts.fontRegular),
    fontBoldB64: bytesToBase64(opts.fontBold),
    logoDataUrl: opts.logoDataUrl ?? null,
  };
  assetsPromise = Promise.resolve(cachedAssets);
}

function loadJsPdf(): Promise<JsPdfCtor> {
  if (!jspdfPromise) {
    jspdfPromise = import("jspdf").then((m) => m.jsPDF);
  }
  return jspdfPromise;
}

/** Preload PDF lib + fonts (cart open). */
export function preloadOrderPdf(): Promise<void> {
  return Promise.all([loadJsPdf(), preloadOrderPdfAssets()]).then(() => undefined);
}

/** All layout stays logical until each wrapped line is drawn. Unicode bidi also mirrors brackets. */
const bidi = bidiFactory();
const RTL_OPTS = {
  align: "right" as const,
  // Already visual: explicitly prevent jsPDF's second bidi pass.
  isInputVisual: true,
  isOutputVisual: true,
  isInputRtl: false,
  isOutputRtl: false,
};

export function orderPdfVisualLine(text: string): string {
  // Supplier year shorthand is a single printed token, not a free-standing RTL letter
  // followed by an independent number. Preserve its source spelling on the page.
  const protectedText = text.replace(/(?<![א-ת\w])מ\d{2}(?!\d)/g,
    (token) => `\u202d${token}\u202c`);
  const levels = bidi.getEmbeddingLevels(protectedText, "rtl");
  return bidi.getReorderedString(protectedText, levels)
    .replace(/[\u202a-\u202e\u2066-\u2069]/g, "");
}

function drawRtl(doc: JsPdfDoc, text: string | string[], x: number, y: number, align: "left" | "right" = "right") {
  const lines = (Array.isArray(text) ? text : [text]).map(orderPdfVisualLine);
  doc.text(lines, x, y, { ...RTL_OPTS, align });
}

function displayName(name: string) {
  return expandProductName(name).name || name;
}

function deliveryLabel(v: OrderCustomer["delivery"]) {
  if (v === "pickup") return "איסוף עצמי מלוחמי הגטאות 24, נהריה";
  if (v === "delivery") return "משלוח";
  return "—";
}

function unitPriceLabel(sku: string) {
  const p = catalogPrice(sku);
  return p == null ? priceOrQuoteLabel(sku) : formatCatalogPrice(p);
}

function lineTotalLabel(sku: string, qty: number) {
  const p = catalogPrice(sku);
  if (p == null) return "הצעת מחיר";
  return formatCatalogPrice(p * qty);
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

function allOeList(raw?: string) {
  const { oem, aftermarket } = splitOe(raw);
  const list = oem.length ? oem : aftermarket;
  return list.join(" · ");
}

function registerFonts(doc: JsPdfDoc, assets: OrderPdfAssets) {
  doc.addFileToVFS("Heebo-Regular.ttf", assets.fontRegularB64);
  doc.addFont("Heebo-Regular.ttf", "Heebo", "normal");
  doc.addFileToVFS("Heebo-Bold.ttf", assets.fontBoldB64);
  doc.addFont("Heebo-Bold.ttf", "Heebo", "bold");
  doc.setFont("Heebo", "normal");
}

function textRight(
  doc: JsPdfDoc,
  text: string,
  xRight: number,
  y: number,
  opts?: { fontSize?: number; style?: "normal" | "bold"; color?: string; maxWidth?: number },
) {
  if (opts?.style) doc.setFont("Heebo", opts.style);
  if (opts?.fontSize) doc.setFontSize(opts.fontSize);
  if (opts?.color) doc.setTextColor(opts.color);
  const t = String(text ?? "");
  if (opts?.maxWidth) {
    // split on logical text; jsPDF bidi runs per drawn line
    const lines = doc.splitTextToSize(t, opts.maxWidth) as string[];
    drawRtl(doc, lines, xRight, y);
    return lines.length;
  }
  drawRtl(doc, t, xRight, y);
  return 1;
}

function ensureSpace(doc: JsPdfDoc, y: number, need: number, bottom: number, onNewPage: () => number) {
  if (y + need <= bottom) return y;
  doc.addPage();
  return onNewPage();
}

export async function buildOrderPdfBlob(input: OrderPdfInput): Promise<{
  blob: Blob;
  orderRef: string;
  now: Date;
  subtotal: number;
  quoteCount: number;
}> {
  const [jsPDF, assets] = await Promise.all([loadJsPdf(), preloadOrderPdfAssets()]);
  const now = input.now ?? new Date();
  const orderRef = input.orderRef ?? orderRefNow(now);
  const { subtotal, quoteCount } = totals(input.lines);

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  registerFonts(doc, assets);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const left = margin;
  const right = pageW - margin;
  const contentW = right - left;
  const bottom = pageH - 16;

  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(LINE);
      doc.setLineWidth(0.3);
      doc.line(left, pageH - 12, right, pageH - 12);
      doc.setFont("Heebo", "normal");
      doc.setFontSize(8);
      doc.setTextColor(MUTED);
      drawRtl(doc, `${brand.nameHe} · ${brand.phone} · ${brand.address}`, right, pageH - 7);
      drawRtl(doc, `עמוד ${i} מתוך ${pageCount}`, left, pageH - 7, "left");
    }
  };

  const paintPageChrome = (yStart = 18) => {
    // soft paper band
    doc.setFillColor(PAPER);
    doc.rect(0, 0, pageW, 42, "F");
    return yStart;
  };

  let y = paintPageChrome(16);

  // Logo + brand
  if (assets.logoDataUrl) {
    try {
      doc.addImage(assets.logoDataUrl, "JPEG", left, 10, 18, 18);
    } catch {
      /* ignore logo failures */
    }
  }
  textRight(doc, brand.nameHe, right, 16, { fontSize: 16, style: "bold", color: FG });
  textRight(doc, brand.taglineHe, right, 22, { fontSize: 9, style: "normal", color: MUTED });
  textRight(doc, "הזמנה / בקשת הצעת מחיר", right, 30, {
    fontSize: 13,
    style: "bold",
    color: ACCENT,
  });

  // accent bar
  doc.setFillColor(ACCENT);
  doc.rect(left, 36, contentW, 1.2, "F");

  y = 44;
  textRight(doc, `מס׳ הזמנה: ${orderRef}`, right, y, { fontSize: 11, style: "bold", color: FG });
  textRight(doc, `תאריך: ${formatTimestampIl(now)}`, right - contentW / 2 - 2, y, {
    fontSize: 10,
    style: "normal",
    color: MUTED,
  });
  y += 8;

  // Customer / vehicle cards
  const cardH = 38;
  const gap = 4;
  const colW = (contentW - gap) / 2;
  const drawCard = (x: number, title: string, rows: string[]) => {
    doc.setFillColor(CARD);
    doc.setDrawColor(LINE);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, colW, cardH, 2, 2, "FD");
    textRight(doc, title, x + colW - 3, y + 6, { fontSize: 10, style: "bold", color: ACCENT });
    let ty = y + 12;
    for (const row of rows) {
      textRight(doc, row, x + colW - 3, ty, {
        fontSize: 9,
        style: "normal",
        color: FG,
        maxWidth: colW - 6,
      });
      ty += 5;
    }
  };

  const c = input.customer;
  drawCard(left + colW + gap, "לקוח", [
    `שם: ${c.name.trim() || "—"}`,
    `טלפון: ${c.phone.trim() || "—"}`,
    `עיר: ${c.city.trim() || "—"}`,
    `משלוח/איסוף: ${deliveryLabel(c.delivery)}`,
    `הערות: ${c.notes.trim() || "—"}`,
  ]);
  drawCard(left, "רכב", [
    `מס׳ רישוי: ${formatIlPlate(c.plate) || c.plate.trim() || "—"}`,
    `יצרן/דגם/שנה: ${[c.make, c.model, c.year].filter(Boolean).join(" ") || "—"}`,
    `מנוע: ${c.engine.trim() || "—"}`,
  ]);
  y += cardH + 8;

  textRight(doc, "פריטים", right, y, { fontSize: 12, style: "bold", color: FG });
  y += 4;

  const drawItem = (line: OrderLineInput, index: number) => {
    const name = displayName(line.name);
    const oe = allOeList(line.oe);
    const brands = brandMfgPairs(line.oe, 8);
    const link = productAbsoluteUrl(line.sku);
    const unit = unitPriceLabel(line.sku);
    const total = lineTotalLabel(line.sku, line.qty);

    const detailLines: string[] = [
      `מק״ט אצלנו: ${line.sku}`,
    ];
    if (oe) detailLines.push(`מק״ט מקורי (OE): ${oe}`);
    if (brands.length) detailLines.push(`יצרן/מותג + מק״ט יצרן: ${brands.join(" · ")}`);
    detailLines.push(`כמות: ${line.qty}    מחיר יח׳: ${unit}    סה״כ שורה: ${total}`);
    detailLines.push(`קישור: ${link}`);

    // estimate height
    doc.setFont("Heebo", "normal");
    doc.setFontSize(9);
    let bodyH = 0;
    const nameLines = doc.splitTextToSize(`${index + 1}. ${name}`, contentW - 8) as string[];
    bodyH += nameLines.length * 5 + 2;
    for (const d of detailLines) {
      const ls = doc.splitTextToSize(d, contentW - 8) as string[];
      bodyH += ls.length * 4.2;
    }
    const boxH = bodyH + 8;

    y = ensureSpace(doc, y, boxH + 2, bottom, () => {
      const ny = paintPageChrome(16);
      textRight(doc, `המשך הזמנה ${orderRef}`, right, ny, {
        fontSize: 10,
        style: "bold",
        color: MUTED,
      });
      return ny + 8;
    });

    doc.setFillColor(index % 2 === 0 ? PAPER : CARD);
    doc.setDrawColor(LINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(left, y, contentW, boxH, 1.5, 1.5, "FD");

    let ty = y + 5;
    doc.setFont("Heebo", "bold");
    doc.setFontSize(10);
    doc.setTextColor(FG);
    drawRtl(doc, nameLines, right - 3, ty);
    ty += nameLines.length * 5 + 1;

    doc.setFont("Heebo", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED);
    for (const d of detailLines) {
      const ls = doc.splitTextToSize(d, contentW - 8) as string[];
      drawRtl(doc, ls, right - 3, ty);
      ty += ls.length * 4.2;
    }

    y += boxH + 3;
  };

  input.lines.forEach((line, i) => drawItem(line, i));

  y = ensureSpace(doc, y, 36, bottom, () => paintPageChrome(20));

  doc.setFillColor(PAPER);
  doc.setDrawColor(LINE);
  doc.roundedRect(left, y, contentW, 28, 2, 2, "FD");
  textRight(doc, "סיכום", right - 3, y + 6, { fontSize: 11, style: "bold", color: ACCENT });
  textRight(
    doc,
    `סכום ביניים (פריטים עם מחיר מחירון): ${formatCatalogPrice(subtotal)}`,
    right - 3,
    y + 13,
    { fontSize: 10, style: "bold", color: FG },
  );
  textRight(doc, `פריטים בהצעת מחיר: ${quoteCount}`, right - 3, y + 19, {
    fontSize: 9,
    style: "normal",
    color: MUTED,
  });
  textRight(doc, DISCLAIMER, right - 3, y + 25, {
    fontSize: 8,
    style: "normal",
    color: MUTED,
    maxWidth: contentW - 6,
  });

  drawFooter();

  const ab = doc.output("arraybuffer") as ArrayBuffer;
  const blob = new Blob([ab], { type: "application/pdf" });
  return { blob, orderRef, now, subtotal, quoteCount };
}

export function buildOrderShareText(opts: {
  orderRef: string;
  customer: OrderCustomer;
  itemCount: number;
  subtotal: number;
}) {
  const { orderRef, customer, itemCount, subtotal } = opts;
  return [
    `הזמנה ${orderRef}`,
    `שם: ${customer.name.trim()}`,
    `טלפון: ${customer.phone.trim()}`,
    `מס׳ רישוי: ${formatIlPlate(customer.plate) || customer.plate.trim()}`,
    `פריטים: ${itemCount}`,
    `סכום ביניים: ${formatCatalogPrice(subtotal)}`,
    "PDF מצורף",
  ].join("\n");
}

export function waMeUrlForShareText(text: string) {
  return `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function canSharePdfFile(file: File) {
  try {
    return typeof navigator !== "undefined" && typeof navigator.share === "function" &&
      (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }));
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export const ORDER_SHARE_HINT = "בחרו וואטסאפ ← חזי אורקור";
export const ORDER_DISCLAIMER = DISCLAIMER;
