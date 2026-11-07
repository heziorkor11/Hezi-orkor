import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync } from "node:fs";
const code = ts.transpileModule(readFileSync("src/lib/bulk-tiers.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { bulkPrice } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);
const rule = {
  id: "category",
  targetType: "category",
  target: "workshop-packs",
  enabled: true,
  public: true,
  aggregate: false,
  tiers: [
    { minPacks: 5, percent: 10 },
    { minPacks: 10, percent: 20 },
  ],
};
const price = (qty, rules = [rule], lines = []) =>
  bulkPrice("A", "workshop-packs", qty, 100, 100, rules, lines);
assert.equal(price(4).price, 100);
assert.equal(price(5).price, 90);
assert.equal(price(10).price, 80);
assert.equal(price(100, []).price, 100);
assert.equal(price(100, [{ ...rule, enabled: false }]).price, 100);
assert.equal(price(5, [{ ...rule, public: false }]).price, null);
assert.equal(bulkPrice("A", "brakes", 100, 100, 100, [rule]).price, 100);
assert.equal(bulkPrice("A", "workshop-packs", 5, 100, 70, [rule]).price, 70);
assert.equal(bulkPrice("A", "workshop-packs", 5, null, null, [rule]).price, null);
const aggregate = { ...rule, aggregate: true };
const lines = [
  { sku: "A", category: "workshop-packs", qty: 2 },
  { sku: "B", category: "workshop-packs", qty: 3 },
  { sku: "C", category: "brakes", qty: 20 },
];
assert.equal(price(2, [aggregate], lines).price, 90);
const own = {
  ...rule,
  id: "own",
  targetType: "product",
  target: "B",
  tiers: [{ minPacks: 1, percent: 5 }],
};
assert.equal(price(2, [aggregate, own], lines).price, 100);
assert.equal(bulkPrice("B", "workshop-packs", 3, 100, 100, [aggregate, own], lines).price, 95);
assert.equal(price(2, [rule], lines).price, 100);
console.log(
  "PASS bulk tiers: thresholds, no defaults, disabled, quote confidentiality, no stacking, null prices, per-SKU priority, eligible cross-SKU totals",
);
