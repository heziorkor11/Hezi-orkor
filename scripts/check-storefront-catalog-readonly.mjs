/** Reproduce Vercel: cwd has no project assets and outbound catalog fetch is forbidden. */
import assert from "node:assert/strict";
const handler = new URL("../.vercel/output/functions/__server.func/index.mjs", import.meta.url);
process.env.VERCEL = "1";
process.env.VERCEL_URL = "protected-preview.invalid";
process.chdir("/proc"); // read-only on Linux, outside the checkout
let outbound = 0;
globalThis.fetch = async () => { outbound++; throw new Error("Outbound HTTP forbidden in catalog regression test"); };
const { default: app } = await import(handler.href);
async function page(path) {
 const response = await app.fetch(new Request("https://protected-preview.invalid" + path));
 assert.equal(response.status, 200, path);
 return response.text();
}
const general = await page("/results?category=general");
assert.match(general, /href="\/product\/HZ-/);
assert.match(general, /data-product-placeholder/);
assert.doesNotMatch(general, /לא מצאנו התאמה בקטלוג/);
const search = await page("/results?q=HZ-GEN-00005");
assert.match(search, /אנטיראסט אדום 4 ליטר/);
assert.match(await page("/product/HZ-GEN-00005"), /<h1[^>]*>אנטיראסט אדום 4 ליטר<\/h1>/);
assert.match(await page("/product/HZ-GEN-01392"), /<h1[^>]*>בולם שברולט קרוז קדמי L מ 08 עד 11 אסטרה מ 11<\/h1>/);
const missingImage = await page("/product/HZ-GEN-00023");
assert.match(missingImage.split("<h1")[0], /data-product-placeholder/);
assert.equal(outbound, 0, "Server must not self-fetch a protected or stale catalog");
console.log("PASS: nonempty general + SKU search + both product pages + neutral placeholder; read-only cwd, zero outbound HTTP.");
