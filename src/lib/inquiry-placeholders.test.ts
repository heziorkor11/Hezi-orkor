import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCategoryInquiry,
  buildInquiryMessage,
  buildOverviewInquiries,
  inquiryEligibleCategories,
  inquiryWhatsAppUrl,
} from "./inquiry-placeholders.ts";

const categories = [
  { id: "brakes", name: "בלמים" },
  { id: "water-pump", name: "משאבות מים" },
  { id: "ac-compressor", name: "מדחס מזגן" },
  { id: "fluids", name: "שמנים ונוזלים" },
  { id: "additives", name: "תוספים" },
  { id: "cleaning-maintenance", name: "ניקוי ותחזוקה" },
  { id: "workshop-packs", name: "מחירי מוסך / מארזים" },
  { id: "general", name: "כללי" },
  { id: "lights", name: "פנס ראשי" },
  { id: "small-engine", name: "מנועים קטנים" },
];
const hidden = (id: string) => id === "lights" || id === "small-engine";
const img = (id: string) => (id === "ac-compressor" ? undefined : `/img/${id}.jpg`);
const juke = { make: "ניסאן", model: "ג'וק", year: "2014" };

test("eligible categories drop vehicle-optional, general and hidden", () => {
  assert.deepEqual(
    inquiryEligibleCategories(categories, hidden).map((c) => c.id),
    ["brakes", "water-pump", "ac-compressor"],
  );
});

test("overview: one placeholder per category without a fitting product", () => {
  const out = buildOverviewInquiries({
    state: juke,
    categories,
    fittedCategoryIds: new Set(["brakes"]),
    imageFor: img,
    isHidden: hidden,
  });
  assert.deepEqual(out, [
    { categoryId: "water-pump", label: "משאבות מים", image: "/img/water-pump.jpg" },
    { categoryId: "ac-compressor", label: "מדחס מזגן", image: undefined },
  ]);
});

test("overview: nothing without a vehicle, or with text search / category / fluids", () => {
  const base = { categories, fittedCategoryIds: new Set<string>(), imageFor: img, isHidden: hidden };
  assert.deepEqual(buildOverviewInquiries({ ...base, state: {} }), []);
  assert.deepEqual(buildOverviewInquiries({ ...base, state: { make: "ניסאן" } }), []);
  assert.deepEqual(buildOverviewInquiries({ ...base, state: { ...juke, q: "משאבה" } }), []);
  assert.deepEqual(buildOverviewInquiries({ ...base, state: { ...juke, category: "brakes" } }), []);
  assert.deepEqual(buildOverviewInquiries({ ...base, state: { ...juke, fluidKind: "engine" } }), []);
  assert.deepEqual(buildOverviewInquiries({ ...base, state: { ...juke, type: "brakes" } }), []);
});

test("overview: hidden categories never appear even if absent from fitted set", () => {
  const out = buildOverviewInquiries({
    state: juke,
    categories,
    fittedCategoryIds: new Set(["brakes", "water-pump", "ac-compressor"]),
    imageFor: img,
    isHidden: hidden,
  });
  assert.deepEqual(out, []);
});

test("drilled-in empty category → placeholder; non-empty / excluded → null", () => {
  const base = { categories, imageFor: img, isHidden: hidden };
  assert.deepEqual(
    buildCategoryInquiry({ ...base, state: { ...juke, category: "water-pump" }, total: 0 }),
    { categoryId: "water-pump", label: "משאבות מים", image: "/img/water-pump.jpg" },
  );
  assert.equal(buildCategoryInquiry({ ...base, state: { ...juke, category: "water-pump" }, total: 3 }), null);
  assert.equal(buildCategoryInquiry({ ...base, state: { ...juke, category: "fluids" }, total: 0 }), null);
  assert.equal(buildCategoryInquiry({ ...base, state: { ...juke, category: "lights" }, total: 0 }), null);
  assert.equal(buildCategoryInquiry({ ...base, state: { category: "water-pump" }, total: 0 }), null);
  assert.equal(
    buildCategoryInquiry({ ...base, state: { ...juke, category: "water-pump", q: "x" }, total: 0 }),
    null,
  );
});

test("drilled-in sub-category uses the sub name", () => {
  const out = buildCategoryInquiry({
    categories: [{ id: "filters", name: "פילטרים" }],
    imageFor: img,
    state: { ...juke, category: "filters", sub: "oil" },
    total: 0,
    subName: "פילטר שמן",
  });
  assert.equal(out?.label, "פילטר שמן");
});

test("message includes plate, vehicle and part", () => {
  const msg = buildInquiryMessage("משאבות מים", { ...juke, plate: "1234567" });
  assert.match(msg, /משאבות מים/);
  assert.match(msg, /מספר רכב: 12-345-67/);
  assert.match(msg, /ניסאן ג'וק 2014/);
});

test("message without plate omits the plate line", () => {
  const msg = buildInquiryMessage("מדחס מזגן", juke);
  assert.doesNotMatch(msg, /מספר רכב/);
  assert.match(msg, /מדחס מזגן/);
});

test("WhatsApp URL is encoded and uses the given number", () => {
  const url = inquiryWhatsAppUrl("972524858516", "מדחס מזגן", { ...juke, plate: "12345678" });
  assert.ok(url.startsWith("https://wa.me/972524858516?text="));
  const text = decodeURIComponent(url.split("?text=")[1]);
  assert.match(text, /מספר רכב: 123-45-678/);
});
