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

test("fitment overlay for HZ-CMP-00071 is Nissan Qashqai 2008-2012", () => {
  const fitments = getFitmentOverride("HZ-CMP-00071");
  assert.deepEqual(fitments, [{ make: "ניסאן", model: "קשקאי", yearFrom: 2008, yearTo: 2012 }]);
  const compressor = hitBySku("HZ-CMP-00071");
  assert.equal(productFitsVehicle(compressor, "ניסאן", "קשקאי", "2010"), true);
  assert.equal(productFitsVehicle(compressor, "ניסאן", "קשקאי", "2015"), false);
  assert.equal(productFitsVehicle(compressor, "ניסאן", "NV200", "2010"), false);
});

test("fitment overlay for HZ-CMP-00438 is Hyundai Santa Fe 2012 only", () => {
  const fitments = getFitmentOverride("HZ-CMP-00438");
  assert.deepEqual(fitments, [{ make: "יונדאי", model: "סנטה פה", yearFrom: 2012, yearTo: 2012 }]);
  const compressor = hitBySku("HZ-CMP-00438");
  assert.equal(productFitsVehicle(compressor, "יונדאי", "סנטה פה", "2012"), true);
  assert.equal(productFitsVehicle(compressor, "יונדאי", "סנטה פה", "2011"), false);
  assert.equal(productFitsVehicle(compressor, "יונדאי", "I30", "2012"), false);
});

test("fitment overlay for HZ-CND-00048 covers Nissan Juke, Note, and Micra without years", () => {
  const fitments = getFitmentOverride("HZ-CND-00048");
  assert.deepEqual(fitments, [
    { make: "ניסאן", model: "ג'וק", yearFrom: 0, yearTo: 0 },
    { make: "ניסאן", model: "נוט", yearFrom: 0, yearTo: 0 },
    { make: "ניסאן", model: "מיקרה", yearFrom: 0, yearTo: 0 },
  ]);
  const condenser = hitBySku("HZ-CND-00048");
  assert.equal(productFitsVehicle(condenser, "ניסאן", "ג'וק", "2014"), true);
  assert.equal(productFitsVehicle(condenser, "ניסאן", "נוט", "2012"), true);
  assert.equal(productFitsVehicle(condenser, "ניסאן", "מיקרה", "2010"), true);
  assert.equal(productFitsVehicle(condenser, "ניסאן", "NV200", "2013"), false);
});
