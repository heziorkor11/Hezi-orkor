import assert from "node:assert/strict";
import ts from "typescript";
import { readFile } from "node:fs/promises";
async function typed(path, stripImports = false) {
  let src = await readFile(path, "utf8");
  if (stripImports) src = src.replace(/^import[^\n]*\n/gm, "");
  const code = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
}
const { packUnitValue, quantitySavings } = await typed("src/lib/bulk-unit-value.ts");
const { parsePackSize } = await typed("src/lib/pack-price.ts", true);
assert.deepEqual(parsePackSize("KIAHYUNDAI 0W30 C2/GF6A 1L שמן מנוע MOTUL-מארז 12 יח'"), {
  kind: "unit",
  qty: 12,
  unitLiters: 1,
});
assert.deepEqual(packUnitValue({ kind: "unit", qty: 12 }, 917), { price: 76.42, unit: "ליחידה" });
assert.deepEqual(packUnitValue({ kind: "liter", qty: 20 }, 200), { price: 10, unit: "לליטר" });
assert.equal(packUnitValue(null, 200), null);
assert.equal(packUnitValue({ kind: "unit", qty: 12 }, null), null);
assert.equal(quantitySavings(100, 90, 5, 10), 50);
assert.equal(quantitySavings(100, 100, 5, 0), 0);
assert.equal(quantitySavings(100, 80, 5, 0), 0, "not a configured tier: no invented savings");
assert.equal(quantitySavings(null, null, 5, 10), 0);
assert.equal(quantitySavings(89, 80.1, 3, 10), 26.7);
console.log(
  "PASS unit-value: explicit volume, exact per-pack unit/liter division, cent rounding, real configured tier savings only, quote/null safe",
);
