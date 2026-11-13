import assert from "node:assert/strict";
import { test } from "node:test";
import {
  catalogPrice,
  ceilShekel,
  getPriceOverride,
  priceOrQuoteLabel,
  WORKSHOP_PACK_PRICE_LABEL,
} from "./prices.ts";

test("ceilShekel rounds up after a 2-decimal guard", () => {
  assert.equal(ceilShekel(45.1), 46);
  assert.equal(ceilShekel(45.0), 45);
  assert.equal(ceilShekel(45.0000001), 45);
  assert.equal(ceilShekel(14.8), 15);
  assert.equal(ceilShekel(16910.82), 16911);
});

test("WJS price override is ceiled for display and cart math", () => {
  assert.equal(getPriceOverride("HZ-CAF-00002"), 14.8);
  assert.equal(catalogPrice("HZ-CAF-00002"), 15);
});

test("workshop-pack drum oil hides the numeric price even with a WJS override", () => {
  assert.equal(catalogPrice("HZ-OIL-00032"), null);
  assert.equal(priceOrQuoteLabel("HZ-OIL-00032"), WORKSHOP_PACK_PRICE_LABEL);
});

test("workshop-packs hide the numeric price everywhere", () => {
  assert.equal(catalogPrice("HZ-OIL-00001"), null);
  assert.equal(priceOrQuoteLabel("HZ-OIL-00001"), WORKSHOP_PACK_PRICE_LABEL);
});

test("SKUs without an override keep a ceiled catalog price", () => {
  const p = catalogPrice("HZ-CMP-00001");
  assert.ok(p == null || (typeof p === "number" && p > 0 && Number.isInteger(p)));
  assert.equal(getPriceOverride("HZ-CMP-00001"), undefined);
});
