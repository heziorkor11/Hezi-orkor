/** Run after npm run build: real emitted Vercel request handler, no browser emulation. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const visibility = JSON.parse(await readFile(new URL("../public/catalog/display-taxonomy.json", import.meta.url), "utf8")).bySku;
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
// Removed כללי — must redirect home (or land on home content), never crash.
{
 const r = await app.fetch(new Request("http://localhost:3200/results?category=general"), { redirect: "manual" });
 assert.ok([200, 301, 302, 307, 308].includes(r.status), `general status ${r.status}`);
 const html = await r.text();
 assert.doesNotMatch(html, /Application error|TypeError/i);
}
const brakes = await page("/results?category=brakes");
assert.match(brakes, /href="\/product\/HZ-/);
// Image-first brakes pages may have real photos; placeholders remain on no-image products.
assert.match((await page("/product/HZ-GEN-00007")).split("<h1")[0], /data-product-placeholder/);
for (const [sku, expected] of [["HZ-GEN-00005", "אנטיראסט אדום 4 ליטר"], ["HZ-GEN-01392", "בולם שברולט קרוז קדמי L מ 08 עד 11 אסטרה מ 11"]]) {
 if (visibility[sku]?.hidden) { await page("/product/" + sku, 404); continue; }
 const html = await page("/product/" + sku);
 assert.ok(html.includes(">" + expected + "</h1>"));
 assert.match(html, /data-product-placeholder/); // related cards use the same neutral component
}
// HZ-GEN-00023 is now hidden with the כללי removal; 00025 stays as cleaning-maintenance.
await page("/product/HZ-GEN-00023", 404);
{
 const map = JSON.parse(await readFile("public/catalog/sku-map.json", "utf8"));
 const rows = JSON.parse(await readFile(`public/catalog/chunks/${map["HZ-GEN-00025"]}.json`, "utf8"));
 const original = rows.find(p => p.sku === "HZ-GEN-00025");
 assert.ok((await page("/product/HZ-GEN-00025")).includes(">" + original.name + "</h1>"));
}
console.log("PASS: invalid category, HTTP 404 + Hebrew content, neutral placeholders, exact display spacing, protected names; general removed.");
