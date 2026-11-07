import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(new URL("../src/lib/cart-pricing.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { summarizeCart } = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
test("cart preserves existing unit prices, quantity multiplication and quote-only lines without extra VAT", () => {
 const prices = { a: 373, b: 595, decimal: 89.5 };
 const resolve = sku => prices[sku] ?? null;
 const result = summarizeCart([{sku:"a",qty:2},{sku:"b",qty:3},{sku:"missing",qty:4}], resolve);
 assert.equal(result.bySku.a.unitPrice,373); assert.equal(result.bySku.a.lineTotal,746);
 assert.equal(result.bySku.b.lineTotal,1785); assert.equal(result.subtotal,2531);
 assert.equal(result.quoteCount,1); assert.equal(result.bySku.missing.lineTotal,null);
 assert.equal(summarizeCart([{sku:"decimal",qty:3}],resolve).subtotal,268.5);
 assert.equal(summarizeCart([],resolve).subtotal,0);
 assert.equal(summarizeCart([{sku:"hidden",qty:3}],()=>null).quoteCount,1);
});
test("headlight footer uses actual lights slug, never radiator", async () => {
 const footer = await readFile(new URL("../src/components/site-footer.tsx", import.meta.url),"utf8");
 assert.match(footer,/category: "lights"[\s\S]{0,90}פנס ראשי/);
 assert.doesNotMatch(footer,/category: "radiator"[\s\S]{0,90}פנס ראשי/);
});
