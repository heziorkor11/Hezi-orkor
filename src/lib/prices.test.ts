import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogPrice, getPriceOverride, isPriceHiddenOverride } from "./prices.ts";

test("WJS price override is used instead of the source catalog price", () => {
  assert.equal(getPriceOverride("HZ-CAF-00002"), 14.8);
  assert.equal(catalogPrice("HZ-CAF-00002"), 14.8);
  assert.notEqual(catalogPrice("HZ-CAF-00002"), 30);
});

test("previously hidden drum oils show the WJS override", () => {
  assert.equal(catalogPrice("HZ-OIL-00032"), 16910.82);
  assert.equal(isPriceHiddenOverride("HZ-OIL-00032"), false);
});

test("SKUs without an override keep the existing catalog price", () => {
  const p = catalogPrice("HZ-CMP-00001");
  assert.ok(p == null || (typeof p === "number" && p > 0));
  assert.equal(getPriceOverride("HZ-CMP-00001"), undefined);
});
