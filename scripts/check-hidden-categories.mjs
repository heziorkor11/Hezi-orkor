import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalog = new URL("../public/catalog/", import.meta.url);
const hiddenCfg = JSON.parse(await readFile(new URL("hidden-categories.json", catalog), "utf8"));
const taxonomy = JSON.parse(await readFile(new URL("display-taxonomy.json", catalog), "utf8"));
const manifest = JSON.parse(await readFile(new URL("manifest.json", catalog), "utf8"));
const map = JSON.parse(await readFile(new URL("sku-map.json", catalog), "utf8"));

assert.ok(hiddenCfg.hiddenCategories.includes("lights"), "lights must be on the hidden-categories switch");
assert.ok(!hiddenCfg.hiddenCategories.includes("lighting"), "do not hide lighting (bulbs)");
assert.ok(!hiddenCfg.hiddenCategories.includes("ac-compressor"));
assert.ok(!hiddenCfg.hiddenCategories.includes("ac-condenser"));

const manifestLights = manifest.categories.find((c) => c.id === "lights");
assert.equal(manifestLights?.count, 3777, "source manifest must keep the lights category and its 3,777 products");
assert.equal(taxonomy.categories.find((c) => c.id === "lights")?.count, 3777, "taxonomy keeps lights so the switch is reversible");
assert.equal(taxonomy.categories.find((c) => c.id === "lighting")?.count, 195);

const lightsSkus = Object.entries(taxonomy.bySku).filter(([, ov]) => ov.category === "lights").map(([sku]) => sku);
assert.equal(lightsSkus.length, 3777);
assert.equal(lightsSkus.filter((sku) => taxonomy.bySku[sku].hidden).length, 0, "category hide is the switch, not baked bySku.hidden flags");

const lightingSkus = Object.entries(taxonomy.bySku).filter(([, ov]) => ov.category === "lighting").map(([sku]) => sku);
assert.equal(lightingSkus.length, 195);
const hdlCompressor = Object.entries(taxonomy.bySku).filter(([sku, ov]) => sku.startsWith("HZ-HDL-") && ov.category === "ac-compressor").map(([sku]) => sku);
const hdlLighting = Object.entries(taxonomy.bySku).filter(([sku, ov]) => sku.startsWith("HZ-HDL-") && ov.category === "lighting").map(([sku]) => sku);
assert.equal(hdlCompressor.length, 24);
assert.equal(hdlLighting.length, 13);

const sampleLights = "HZ-HDL-00001";
const sampleBulb = "HZ-LMP-00001";
const sampleCompressor = "HZ-CMP-00014";
const sampleHdlCompressor = "HZ-HDL-03518";
assert.equal(taxonomy.bySku[sampleLights].category, "lights");
assert.equal(taxonomy.bySku[sampleBulb].category, "lighting");
assert.equal(taxonomy.bySku[sampleCompressor].category, "ac-compressor");
assert.equal(taxonomy.bySku[sampleHdlCompressor].category, "ac-compressor");

for (const sku of [sampleLights, sampleBulb, sampleCompressor, sampleHdlCompressor]) {
  const chunk = JSON.parse(await readFile(new URL(`chunks/${map[sku]}.json`, catalog), "utf8"));
  const row = chunk.find((p) => p.sku === sku);
  assert.ok(row, `source row must remain intact: ${sku}`);
  assert.equal(row.sku, sku);
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

async function fetchPath(path) {
  return app.fetch(new Request("http://local.invalid" + path));
}

for (const sku of [sampleLights, lightsSkus[10], lightsSkus[100]]) {
  const r = await fetchPath("/product/" + sku);
  assert.equal(r.status, 404, sku);
  assert.match(await r.text(), /<h1[^>]*>העמוד לא נמצא<\/h1>/);
}

for (const sku of [sampleBulb, sampleCompressor, sampleHdlCompressor]) {
  const r = await fetchPath("/product/" + sku);
  assert.equal(r.status, 200, sku + " must stay visible");
  const html = await r.text();
  assert.match(html, new RegExp(`<h1[^>]*>[^<]*${sku}|${sku}`));
  assert.doesNotMatch(html, /<h1[^>]*>העמוד לא נמצא<\/h1>/);
}

{
  const r = await fetchPath("/results?category=lights");
  assert.ok([301, 302, 303, 307, 308].includes(r.status), `lights category redirect, got ${r.status}`);
  const loc = new URL(r.headers.get("location") || "http://missing.invalid", "http://local.invalid");
  assert.equal(loc.pathname, "/results");
  assert.equal(loc.search, "");
}

{
  const home = await fetchPath("/");
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.doesNotMatch(html, /results\?category=lights/);
  assert.doesNotMatch(html, /פנסים ראשיים אינם מוצגים כרגע באתר/);
}

{
  const q = encodeURIComponent("פנס ראשי");
  const r = await fetchPath("/results?q=" + q);
  assert.equal(r.status, 200);
  const html = await r.text();
  for (const sku of [sampleLights, lightsSkus[10], lightsSkus[100]]) {
    assert.ok(!html.includes(`href="/product/${sku}"`), `search פנס ראשי still links ${sku}`);
  }
  assert.doesNotMatch(html, /results\?category=lights/);
}

{
  const r = await fetchPath("/results?category=lighting");
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /href="\/product\//);
  const bulb = await fetchPath("/results?q=HZ-LMP-00001");
  assert.equal(bulb.status, 200);
  assert.match(await bulb.text(), /href="\/product\/HZ-LMP-00001"/);
}

{
  const r = await fetchPath("/results?category=ac-compressor");
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /href="\/product\/HZ-CMP-/);
  const cmp = await fetchPath("/results?q=HZ-CMP-00014");
  assert.equal(cmp.status, 200);
  assert.match(await cmp.text(), /href="\/product\/HZ-CMP-00014"/);
  const hdl = await fetchPath("/results?q=HZ-HDL-03518");
  assert.equal(hdl.status, 200);
  assert.match(await hdl.text(), /href="\/product\/HZ-HDL-03518"/);
}

assert.equal(outbound, 0);
console.log("PASS: hidden-categories switch hides 3,777 lights products; lighting and compressor (including HZ-HDL) stay visible; source rows retained.");
