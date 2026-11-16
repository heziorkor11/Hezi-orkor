import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import type { SearchHit } from "./catalog-types.ts";
import { applySearchHitFitmentOverride, getFitmentOverride } from "./fitment-overrides.ts";
import { productFitsVehicle } from "./search-intent.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const index = JSON.parse(readFileSync(join(root, "public/catalog/search-index.json"), "utf8")) as SearchHit[];

function hitBySku(sku: string) {
  const hit = index.find((row) => row.sku === sku);
  assert.ok(hit, `missing search-index row ${sku}`);
  return hit;
}

test("fitment overlay for HZ-CND-00023 is Nissan NV200 without years", () => {
  const fitments = getFitmentOverride("HZ-CND-00023");
  assert.deepEqual(fitments, [{ make: "ניסאן", model: "NV200", yearFrom: 0, yearTo: 0 }]);
  const applied = applySearchHitFitmentOverride(hitBySku("HZ-CND-00023"));
  assert.equal(applied.make, "ניסאן");
  assert.equal(applied.model, "NV200");
  assert.deepEqual(applied.fitments, fitments);
  assert.equal(getFitmentOverride("HZ-CMP-00071"), undefined);
});

test("NV200 2013 matches the overlaid condenser and a non-NV200 Nissan does not", () => {
  const condenser = hitBySku("HZ-CND-00023");
  // Source search-index row has no structured make/model; overlay is applied at match time.
  assert.equal(condenser.make, undefined);
  assert.equal(condenser.model, undefined);
  assert.equal(productFitsVehicle(condenser, "ניסאן", "NV200", "2013"), true);
  assert.equal(productFitsVehicle(condenser, "ניסאן", "קשקאי", "2013"), false);
  assert.equal(productFitsVehicle(condenser, "ניסאן", "מיקרה", "2010"), false);
});
