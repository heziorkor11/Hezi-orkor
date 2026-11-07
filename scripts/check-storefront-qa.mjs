/** Run after npm run build: real emitted Vercel request handler, no browser emulation. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { default: app } = await import("../.vercel/output/functions/__server.func/index.mjs");
async function page(path, status = 200) {
 const r = await app.fetch(new Request("http://localhost:3200" + path));
 assert.equal(r.status, status, path);
 return r.text();
}
const invalid = await page("/results?category=unknown-qa&oilBrand=bogus");
assert.match(invalid, /<h1[^>]*>קטגוריה לא נמצאה<\/h1>/);
assert.doesNotMatch(invalid, /נאתר את השמן|כל השמנים|<h1[^>]*>unknown/);
for (const path of ["/unknown-qa", "/unknown-qa/deep", "/not-real?a=b"]) {
 const html = await page(path, 404);
 assert.match(html, /<h1[^>]*>העמוד לא נמצא<\/h1>/);
 assert.match(html, /noindex, follow/);
}
const general = await page("/results?category=general");
assert.match(general, /data-product-placeholder/);
assert.doesNotMatch(general, /<img[^>]+src=["'](?:["']|[^"']*placeholder)/);
for (const [sku, expected] of [["HZ-GEN-00005", "אנטיראסט אדום 4 ליטר"], ["HZ-GEN-01392", "בולם שברולט קרוז קדמי L מ 08 עד 11 אסטרה מ 11"]]) {
 const html = await page("/product/" + sku);
 assert.ok(html.includes(">" + expected + "</h1>"));
 assert.match(html, /data-product-placeholder/); // related cards use the same neutral component
}
for (const sku of ["HZ-GEN-00023", "HZ-GEN-00025"]) {
 const map = JSON.parse(await readFile("public/catalog/sku-map.json", "utf8"));
 const rows = JSON.parse(await readFile(`public/catalog/chunks/${map[sku]}.json`, "utf8"));
 const original = rows.find(p => p.sku === sku);
 assert.ok((await page("/product/" + sku)).includes(">" + original.name + "</h1>"));
}
console.log("PASS: invalid category, HTTP 404 + Hebrew content, neutral placeholders, exact display spacing, protected names.");
