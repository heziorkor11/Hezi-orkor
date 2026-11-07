import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const catalog = new URL("../public/catalog/", import.meta.url);
const expected = ["00007", "00008", "00009", "00020", "00021", "00022", "00024", "00025", "00026", "00027", "00028"].map(n => `HZ-GEN-${n}`);
const excluded = ["00023", "05486", "05487", "05488"].map(n => `HZ-GEN-${n}`);
const taxonomy = JSON.parse(await readFile(new URL("display-taxonomy.json", catalog), "utf8"));
const actual = Object.entries(taxonomy.bySku).filter(([, p]) => p.category === "cleaning-maintenance").map(([sku]) => sku).sort();
assert.deepEqual(actual, [...expected].sort(), "only the 11 approved products may move");
assert.equal(taxonomy.categories.find(c => c.id === "cleaning-maintenance")?.count, 11);
for (const sku of excluded) assert.equal(taxonomy.bySku[sku].category, "general", sku);
const map = JSON.parse(await readFile(new URL("sku-map.json", catalog), "utf8"));
for (const sku of expected) {
  const rows = JSON.parse(await readFile(new URL(`chunks/${map[sku]}.json`, catalog), "utf8"));
  assert.equal(rows.find(p => p.sku === sku)?.category, "general", "source row must stay general");
}
const handler = new URL("../.vercel/output/functions/__server.func/index.mjs", import.meta.url);
process.env.VERCEL = "1"; process.chdir("/proc");
let outbound = 0; globalThis.fetch = async () => { outbound++; throw new Error("network forbidden"); };
const { default: app } = await import(handler.href);
async function page(path) {
  const response = await app.fetch(new Request("http://local.invalid" + path));
  assert.equal(response.status, 200, path); return response.text();
}
const home = await page("/");
assert.match(home, /results\?category=cleaning-maintenance/);
assert.match(home, /ניקוי ותחזוקה/);
const listing = await page("/results?category=cleaning-maintenance");
assert.match(listing, /<h1[^>]*>ניקוי ותחזוקה<\/h1>/);
const links = [...new Set([...listing.matchAll(/href="\/product\/(HZ-[A-Z]+-\d+)"/g)].map(m => m[1]))].sort();
assert.deepEqual(links, [...expected].sort(), "category listing must render all and only the approved products");
const general = await page("/results?category=general");
for (const sku of expected) {
  assert.ok(!general.includes(`href="/product/${sku}"`), sku + " must leave general");
  assert.match(await page("/product/" + sku), /results\?category=cleaning-maintenance/);
}
for (const sku of excluded) assert.ok(general.includes(`href="/product/${sku}"`), sku + " stays general");
assert.equal(outbound, 0);
console.log("PASS: cleaning-maintenance visible on home/menu; exactly 11 products move via display overrides; excluded products remain general; source rows intact; read-only server bundle without network.");
