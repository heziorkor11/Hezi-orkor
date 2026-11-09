import { readFile } from "node:fs/promises";
/** Reproduce Vercel: cwd has no project assets and outbound catalog fetch is forbidden. */
import assert from "node:assert/strict";
const handler = new URL("../.vercel/output/functions/__server.func/index.mjs", import.meta.url);
const visibility = JSON.parse(await readFile(new URL("../public/catalog/display-taxonomy.json", import.meta.url), "utf8")).bySku;
process.env.VERCEL = "1";
process.env.VERCEL_URL = "protected-preview.invalid";
process.chdir("/proc"); // read-only on Linux, outside the checkout
let outbound = 0;
globalThis.fetch = async () => { outbound++; throw new Error("Outbound HTTP forbidden in catalog regression test"); };
const { default: app } = await import(handler.href);
async function page(path, status = 200) {
 const response = await app.fetch(new Request("https://protected-preview.invalid" + path));
 assert.equal(response.status, status, path);
 return response.text();
}
const brakes = await page("/results?category=brakes");
assert.match(brakes, /href="\/product\/HZ-/);
assert.doesNotMatch(brakes, /לא מצאנו התאמה בקטלוג/);
const search = await page("/results?q=HZ-GEN-00005");
assert.match(search, /אנטיראסט אדום 4 ליטר/);
assert.match(await page("/product/HZ-GEN-00005"), /<h1[^>]*>אנטיראסט אדום 4 ליטר<\/h1>/);
if (visibility["HZ-GEN-01392"]?.hidden) await page("/product/HZ-GEN-01392", 404);
else assert.match(await page("/product/HZ-GEN-01392"), /<h1[^>]*>בולם שברולט קרוז קדמי L מ 08 עד 11 אסטרה מ 11<\/h1>/);
// Product without an image still uses the neutral placeholder.
const missingImage = await page("/product/HZ-GEN-00007");
assert.match(missingImage.split("<h1")[0], /data-product-placeholder/);
// Former general residual SKUs are hidden; source rows remain in chunks.
await page("/product/HZ-GEN-00023", 404);
assert.equal(outbound, 0, "Server must not self-fetch a protected or stale catalog");
console.log("PASS: brakes listing + SKU search + product pages; general residuals hidden; read-only cwd, zero outbound HTTP.");
