import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../src/lib/display-spacing.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { displaySpacing } = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
test("display spacing changes whitespace only, without expanding years or changing models", () => {
  for (const [sku, input, expected] of [
    ["HZ-GEN-00005", "אנטיראסט אדום4 ליטר", "אנטיראסט אדום 4 ליטר"],
    ["HZ-GEN-01392", "בולם שברולט קרוז קדמיL מ08 עד11 אסטרה מ11", "בולם שברולט קרוז קדמי L מ 08 עד 11 אסטרה מ 11"],
  ]) {
    const result = displaySpacing(sku, input);
    assert.equal(result, expected);
    assert.equal(result.replace(/\s/g, ""), input.replace(/\s/g, ""));
    assert.equal(displaySpacing(sku, result), result);
  }
});
test("other SKUs, protected names and part-number strings stay untouched", () => {
  for (const sku of ["HZ-GEN-00023", "HZ-GEN-00025", "HZ-OTHER-00001"])
    assert.equal(displaySpacing(sku, "אדום4 ליטר קדמיL מ08 עד11 OE 123AB"), "אדום4 ליטר קדמיL מ08 עד11 OE 123AB");
});
