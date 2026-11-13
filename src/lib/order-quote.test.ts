import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildOrderShareMessage,
  WA_URL_SOFT_LIMIT,
  type OrderCustomer,
  type OrderLineInput,
} from "./order-quote.ts";
import { catalogPrice, formatCatalogPrice, WORKSHOP_PACK_PRICE_LABEL } from "./prices.ts";

const customer: OrderCustomer = {
  name: "בדיקה",
  phone: "0500000000",
  city: "נהריה",
  delivery: "pickup",
  plate: "1234567",
  make: "טויוטה",
  model: "קורולה",
  year: "2015",
  engine: "1.6",
  notes: "בדיקת שליחה",
};

test("WhatsApp share text lists every line, delivery, and rounded totals", () => {
  const six: OrderLineInput[] = [
    { sku: "HZ-CAF-00195", name: "פילטר מזגן סינ סרס 3 מ22", qty: 2 },
    { sku: "HZ-CAF-00002", name: "פילטר מזגן לבדיקה", qty: 1 },
    { sku: "HZ-OIL-00032", name: "שמן מארז מוסך", qty: 1 },
    { sku: "HZ-GEN-00010", name: "מארז אזיקונים", qty: 1 },
    { sku: "HZ-ADD-00001", name: "MANNOL Benzin Ester Additive 9950", qty: 1 },
    { sku: "HZ-CAF-00002", name: "פילטר נוסף", qty: 3 },
  ];
  let subtotal = 0;
  for (const line of six) {
    const p = catalogPrice(line.sku);
    if (p != null) subtotal += p * line.qty;
  }
  const fit = buildOrderShareMessage({
    orderRef: "HZ-ORD-20261113-1525",
    customer,
    lines: six,
    subtotal,
  });
  assert.equal(fit.overLimit, false, `url length ${fit.urlLength} should be under ${WA_URL_SOFT_LIMIT}`);
  assert.ok(fit.urlLength <= WA_URL_SOFT_LIMIT);
  assert.ok(fit.urlLength > 2000, "a 6-item Hebrew cart is expected to exceed the conservative 2000-char budget but stay under 4000");
  for (const line of six) assert.match(fit.text, new RegExp(line.sku));
  assert.match(fit.text, /משלוח: איסוף עצמי, נהריה/);
  assert.match(fit.text, new RegExp(`סכום ביניים: ${formatCatalogPrice(subtotal)}`));
  assert.ok(fit.text.includes("1. HZ-CAF-00195 פילטר מזגן סינ סרס 3 מ22 ×2 — 11 ₪ / 22 ₪"));
  assert.match(fit.text, new RegExp(`HZ-OIL-00032 שמן מארז מוסך ×1 — ${WORKSHOP_PACK_PRICE_LABEL}`));
  assert.match(fit.text, new RegExp(`HZ-GEN-00010 מארז אזיקונים ×1 — ${WORKSHOP_PACK_PRICE_LABEL}`));
  assert.doesNotMatch(fit.text, /מצורף PDF|PDF מצורף/);
  assert.doesNotMatch(fit.text, /קובץ PDF צורף לשיתוף/);
  const oilLine = fit.text.split("\n").find((row) => row.includes("HZ-OIL-00032"));
  assert.ok(oilLine);
  assert.doesNotMatch(oilLine!, /\d+\s*₪/);
});

test("share text mentions an attached PDF only when pdfAttached is set", () => {
  const lines: OrderLineInput[] = [{ sku: "HZ-CAF-00002", name: "פילטר", qty: 1 }];
  const subtotal = catalogPrice("HZ-CAF-00002") ?? 0;
  const plain = buildOrderShareMessage({
    orderRef: "HZ-ORD-TEST-0001",
    customer,
    lines,
    subtotal,
  });
  assert.doesNotMatch(plain.text, /PDF/);
  const attached = buildOrderShareMessage({
    orderRef: "HZ-ORD-TEST-0001",
    customer,
    lines,
    subtotal,
    pdfAttached: true,
  });
  assert.match(attached.text, /קובץ PDF צורף לשיתוף/);
  assert.doesNotMatch(attached.text, /מצורף PDF|PDF מצורף/);
  const linked = buildOrderShareMessage({
    orderRef: "HZ-ORD-TEST-0001",
    customer,
    lines,
    subtotal,
    pdfUrl: "https://hezi-orkor.vercel.app/o/exampletoken",
  });
  assert.match(linked.text, /PDF: https:\/\/hezi-orkor\.vercel\.app\/o\/exampletoken/);
});

test("a long cart still lists every SKU even if names are compacted", () => {
  const lines: OrderLineInput[] = Array.from({ length: 25 }, (_, i) => ({
    sku: `HZ-CAF-${String(i + 1).padStart(5, "0")}`,
    name: "שם מוצר ארוך מאוד לבדיקת קיצור טקסט בוואטסאפ",
    qty: 1,
  }));
  let subtotal = 0;
  for (const line of lines) {
    const p = catalogPrice(line.sku);
    if (p != null) subtotal += p * line.qty;
  }
  const fit = buildOrderShareMessage({
    orderRef: "HZ-ORD-TEST-LONG",
    customer,
    lines,
    subtotal,
  });
  for (const line of lines) assert.match(fit.text, new RegExp(line.sku));
  assert.doesNotMatch(fit.text, /מצורף PDF|PDF מצורף/);
});
