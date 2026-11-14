import assert from "node:assert/strict";
import test from "node:test";
import { nextSkuForPrefix, skuPrefixFor, isValidGeneratedSku } from "./product-sku.ts";

test("SKU prefix follows category and filter sub-type", () => {
  assert.equal(skuPrefixFor("brakes"), "BRK");
  assert.equal(skuPrefixFor("filters", "cabin"), "CAF");
  assert.equal(skuPrefixFor("filters", "oil"), "OILF");
  assert.equal(skuPrefixFor("filters", "air"), "FLT");
  assert.equal(skuPrefixFor("shocks"), "GEN");
});

test("next free SKU is max existing plus one, zero-padded to five digits", () => {
  const sku = nextSkuForPrefix("CAF", ["HZ-CAF-00195", "HZ-CAF-00002", "HZ-BRK-00999"]);
  assert.equal(sku, "HZ-CAF-00196");
  assert.equal(isValidGeneratedSku(sku), true);
});

test("generated SKU validation", () => {
  assert.equal(isValidGeneratedSku("HZ-GEN-00001"), true);
  assert.equal(isValidGeneratedSku("HZ-CAF-15"), false);
  assert.equal(isValidGeneratedSku("../etc/passwd"), false);
});
