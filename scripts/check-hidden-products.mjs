import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const catalog = new URL("../public/catalog/", import.meta.url);
const map = JSON.parse(await readFile(new URL("sku-map.json", catalog), "utf8"));
const policy = JSON.parse(await readFile(new URL("visibility-overrides.json", catalog), "utf8"));
const taxonomy = JSON.parse(await readFile(new URL("display-taxonomy.json", catalog), "utf8"));
const hiddenSkus = [
  "HZ-GEN-01392",
  "HZ-GEN-01393",
  "HZ-GEN-00023",
  "HZ-GEN-05486",
  "HZ-GEN-05487",
  "HZ-GEN-05488",
];
assert.ok(
  !taxonomy.categories.some((c) => c.id === "general"),
  "כללי tile must be removed from taxonomy categories",
);
for (const sku of hiddenSkus) {
  assert.equal(policy.bySku[sku].hidden, true, sku);
  assert.equal(taxonomy.bySku[sku]?.hidden, true, `taxonomy hidden ${sku}`);
  const chunk = JSON.parse(await readFile(new URL(`chunks/${map[sku]}.json`, catalog), "utf8"));
  assert.ok(chunk.some((p) => p.sku === sku), `source row must remain intact: ${sku}`);
}
const handler = new URL("../.vercel/output/functions/__server.func/index.mjs", import.meta.url);
process.env.VERCEL = "1";
process.chdir("/proc");
let outbound = 0;
globalThis.fetch = async () => {
  outbound++;
  throw new Error("network forbidden");
};
const { default: app } = await import(handler.href);
for (const sku of hiddenSkus) {
  const r = await app.fetch(new Request("http://local.invalid/product/" + sku));
  assert.equal(r.status, 404, sku);
  const html = await r.text();
  assert.match(html, /<h1[^>]*>העמוד לא נמצא<\/h1>/);
  const search = await app.fetch(new Request("http://local.invalid/results?q=" + sku));
  assert.equal(search.status, 200);
  assert.ok(!(await search.text()).includes(`href="/product/${sku}"`));
}
for (const path of ["/", "/results?category=shocks", "/product/HZ-GEN-01391"]) {
  const r = await app.fetch(new Request("http://local.invalid" + path));
  assert.equal(r.status, 200, path);
  const html = await r.text();
  for (const sku of hiddenSkus) {
    assert.ok(!html.includes(`href="/product/${sku}"`), `${path} still links ${sku}`);
  }
}
{
  const home = await app.fetch(new Request("http://local.invalid/"));
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.ok(!html.includes("category=general"), "home must not link to removed כללי category");
  assert.ok(!html.includes("href=\"/results?category=general\""), "home must not deep-link כללי");
}
{
  const r = await app.fetch(new Request("http://local.invalid/results?category=general"));
  assert.ok([200, 301, 302, 307, 308].includes(r.status), `general category status ${r.status}`);
  const html = await r.text();
  assert.doesNotMatch(html, /Application error|Cannot read|TypeError/i);
}
assert.equal(outbound, 0);
console.log(
  "PASS: hidden product URLs 404; absent from search/category/home/related; source rows retained; general tile removed.",
);
