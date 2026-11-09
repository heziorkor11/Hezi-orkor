import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const catalog = new URL("../public/catalog/", import.meta.url);
const expected = ["00007", "00008", "00009", "00020", "00021", "00022", "00024", "00025", "00026", "00027", "00028"].map(n => `HZ-GEN-${n}`);
const excluded = ["00023", "05486", "05487", "05488"].map(n => `HZ-GEN-${n}`);
const taxonomy = JSON.parse(await readFile(new URL("display-taxonomy.json", catalog), "utf8"));
const actual = Object.entries(taxonomy.bySku).filter(([, p]) => p.category === "cleaning-maintenance").map(([sku]) => sku).sort();
assert.deepEqual(actual, [...expected].sort(), "only the 11 approved products may move");
assert.equal(taxonomy.categories.find(c => c.id === "cleaning-maintenance")?.count, 11);
assert.equal(taxonomy.categories.find(c => c.id === "general"), undefined, "כללי category removed");
for (const sku of excluded) {
  assert.equal(taxonomy.bySku[sku].hidden, true, sku + " must be hidden");
  assert.equal(taxonomy.bySku[sku].category, "general", sku + " keeps residual general override key");
}
const map = JSON.parse(await readFile(new URL("sku-map.json", catalog), "utf8"));
for (const sku of expected) {
  const rows = JSON.parse(await readFile(new URL(`chunks/${map[sku]}.json`, catalog), "utf8"));
  assert.equal(rows.find(p => p.sku === sku)?.category, "general", "source row must stay general");
}
for (const sku of excluded) {
  const rows = JSON.parse(await readFile(new URL(`chunks/${map[sku]}.json`, catalog), "utf8"));
  assert.ok(rows.some(p => p.sku === sku), "source row must remain intact: " + sku);
}
const handler = new URL("../.vercel/output/functions/__server.func/index.mjs", import.meta.url);
process.env.VERCEL = "1"; process.chdir("/proc");
let outbound = 0; globalThis.fetch = async () => { outbound++; throw new Error("network forbidden"); };
const { default: app } = await import(handler.href);
async function page(path, status = 200) {
  const response = await app.fetch(new Request("http://local.invalid" + path));
  assert.equal(response.status, status, path); return response.text();
}
const home = await page("/");
assert.match(home, /results\?category=cleaning-maintenance/);
assert.match(home, /ניקוי ותחזוקה/);
assert.ok(!home.includes("category=general"), "home must not link to כללי");
const listing = await page("/results?category=cleaning-maintenance");
assert.match(listing, /<h1[^>]*>ניקוי ותחזוקה<\/h1>/);
const links = [...new Set([...listing.matchAll(/href="\/product\/(HZ-[A-Z]+-\d+)"/g)].map(m => m[1]))].sort();
assert.deepEqual(links, [...expected].sort(), "category listing must render all and only the approved products");
for (const sku of expected) {
  assert.match(await page("/product/" + sku), /results\?category=cleaning-maintenance/);
}
for (const sku of excluded) await page("/product/" + sku, 404);
assert.equal(outbound, 0);
console.log("PASS: cleaning-maintenance visible on home/menu; exactly 11 products; excluded residuals hidden; source rows intact; כללי removed.");
