import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canonicalMake,
  listingSearchFromQuery,
  parseSearchIntent,
  sameMake,
} from "./search-intent.ts";

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
