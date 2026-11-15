import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canonicalMake,
  listingSearchFromQuery,
  parseSearchIntent,
  productFitsVehicle,
  resolveTileListingState,
  sameMake,
  tokensMatchHit,
} from "./search-intent.ts";
import type { SearchHit } from "./catalog-types.ts";

test("parses cabin filter + Dacia, including typo without geresh and leading ל", () => {
  for (const q of ["פילטר מזגן דאציה", "פילטר מזגן לדאציה", "מסנן מזגן דאצ'יה", "פ.מזגן דצי"]) {
    const intent = parseSearchIntent(q);
    assert.equal(intent.isPartNumber, false, q);
    assert.deepEqual(intent.allowed, [{ category: "filters", sub: "cabin" }], q);
    assert.equal(intent.make, "דאצ'יה", q);
    assert.deepEqual(intent.restTokens, [], q);
  }
});

test("פילטר מזגן restricts to cabin filters and does not keep leftover type words", () => {
  const intent = parseSearchIntent("פילטר מזגן");
  assert.deepEqual(intent.allowed, [{ category: "filters", sub: "cabin" }]);
  assert.equal(intent.make, undefined);
  assert.deepEqual(intent.restTokens, []);
});

test("רפידות טויוטה and מסנן שמן קיה resolve type + make", () => {
  const pads = parseSearchIntent("רפידות טויוטה");
  assert.deepEqual(pads.allowed, [{ category: "brakes", sub: "pads" }]);
  assert.equal(pads.make, "טויוטה");

  const oil = parseSearchIntent("מסנן שמן קיה");
  assert.deepEqual(oil.allowed, [{ category: "filters", sub: "oil" }]);
  assert.equal(oil.make, "קיה");
});

test("SKU / OE queries stay exact part-number searches", () => {
  const intent = parseSearchIntent("HZ-CND-00537");
  assert.equal(intent.isPartNumber, true);
  assert.deepEqual(intent.allowed, []);
  assert.equal(intent.make, undefined);
});

test("sameMake treats דאציה and דאצ'יה as the same make", () => {
  assert.equal(canonicalMake("דאציה"), "דאצ'יה");
  assert.ok(sameMake("דאציה", "דאצ'יה"));
  assert.ok(sameMake("dacia", "דאצ'יה"));
});

test("header search in the filters category keeps the category when the query is just a make", () => {
  const next = listingSearchFromQuery("דאציה", { category: "filters" });
  assert.equal(next.category, "filters");
  assert.equal(next.make, "דאצ'יה");
  assert.equal(next.q, "דאציה");
});

test("a conflicting part type in the query overrides the current category", () => {
  const next = listingSearchFromQuery("רפידות טויוטה", { category: "filters" });
  assert.equal(next.category, "brakes");
  assert.equal(next.sub, "pads");
  assert.equal(next.make, "טויוטה");
});

test("English type words map to the same categories as Hebrew", () => {
  assert.deepEqual(parseSearchIntent("additives").allowed, [{ category: "additives" }]);
  assert.deepEqual(parseSearchIntent("oils").allowed, [{ category: "fluids" }]);
  assert.equal(parseSearchIntent("additives").restTokens.length, 0);
  assert.equal(parseSearchIntent("oils").restTokens.length, 0);
});


test("מהבה לגרנד שירוקי is a condenser query and keeps Grand tokens", () => {
  const intent = parseSearchIntent("מהבה לגרנד שירוקי");
  assert.deepEqual(intent.allowed, [{ category: "ac-condenser" }]);
  assert.ok(intent.restTokens.includes("גרנד"), intent.restTokens.join("|"));
  assert.ok(intent.restTokens.includes("שירוקי"), intent.restTokens.join("|"));
  assert.equal(intent.restTokens.includes("לגרנד"), false);
  assert.equal(intent.restTokens.includes("מהבה"), false);
});

test("leading ל/ב/ה is stripped only when the remainder is a known token", () => {
  const grand = parseSearchIntent("מעבה לגרנד שירוקי");
  assert.ok(grand.restTokens.includes("גרנד"));
  const land = parseSearchIntent("פילטר לנד רובר");
  assert.equal(land.make, "לנד רובר", JSON.stringify(land));
  assert.equal(land.restTokens.includes("נד"), false);
});

test("Cherokee spelling variants are equivalent in search, Grand stays distinct", () => {
  const cherokee: SearchHit = {
    sku: "x",
    title: "מעבה ג'יפ צ'ירוקי",
    category: "ac-condenser",
    oe: "",
    make: "ג'יפ",
    model: "צ'ירוקי",
  };
  const grand: SearchHit = {
    sku: "y",
    title: "מעבה מזגן ג'יפ גרנד צ'רוקי 2000-2004 NRF",
    titleOriginal: "מעבה גי'פ ג.שירוקי NRF 00-04",
    category: "ac-condenser",
    oe: "",
    make: "ג'יפ",
    model: "",
  };
  assert.equal(tokensMatchHit(cherokee, ["שירוקי"]), true);
  assert.equal(tokensMatchHit(cherokee, ["צרוקי"]), true);
  assert.equal(tokensMatchHit(grand, ["גרנד", "שירוקי"]), true);
  assert.equal(tokensMatchHit(grand, ["מעבה", "גרנד", "שירוקי"]), true);
  assert.equal(productFitsVehicle(cherokee, "ג'יפ", "גרנד שירוקי"), false);
  assert.equal(productFitsVehicle(cherokee, "ג'יפ", "שירוקי"), true);
  assert.equal(productFitsVehicle({ ...grand, model: "ג שירוקי" }, "ג'יפ", "גרנד שירוקי"), true);
  assert.equal(productFitsVehicle({ ...grand, model: "ג שירוקי" }, "ג'יפ", "שירוקי"), false);
});


test("type-intent queries without a category pin tiles to that type, not every category", () => {
  const typo = resolveTileListingState({ q: "מהבה לגרנד שירוקי" });
  assert.equal(typo.category, "ac-condenser");
  const already = resolveTileListingState({ q: "מהבה לגרנד שירוקי", category: "filters" });
  assert.equal(already.category, "filters");
  const free = resolveTileListingState({ q: "גרנד שירוקי" });
  assert.equal(free.category, undefined);
});
