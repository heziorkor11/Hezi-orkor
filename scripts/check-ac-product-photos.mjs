import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url),
  folder = "ac-approved-2026-11-08";
const json = async (p) => JSON.parse(await readFile(new URL(p, root), "utf8"));
const mapping = await json(`public/catalog/images/${folder}.json`),
  sources = await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(Object.keys(mapping).length, 898);
assert.equal(sources.added, 898);
assert.equal(sources.skippedNeedsSource, 649);
assert.deepEqual(sources.categoryCounts, { "ac-compressor": 670, "ac-condenser": 228 });
for (const p of sources.products) {
  assert.equal(p.designerStatus, "ok");
  assert.equal(mapping[p.sku], p.image);
  const bytes = await readFile(new URL("public" + p.image, root));
  assert.equal(bytes.length, p.bytes);
  assert.equal(bytes.subarray(0, 4).toString(), "RIFF");
  assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), p.sha256);
}
const index = await json("public/catalog/search-index.json"),
  tax = await json("public/catalog/display-taxonomy.json");
process.env.VERCEL = "1";
process.chdir("/proc");
globalThis.fetch = async () => {
  throw Error("No network permitted");
};
const { default: app } = await import(
  new URL(".vercel/output/functions/__server.func/index.mjs", root)
);
async function page(path) {
  let r = await app.fetch(new Request("https://local.invalid" + path));
  for (let i = 0; i < 3 && [301, 302, 303, 307, 308].includes(r.status); i++)
    r = await app.fetch(new Request(new URL(r.headers.get("location"), "https://local.invalid")));
  assert.equal(r.status, 200, path);
  return r.text();
}
for (const sku of ["HZ-CMP-00003", "HZ-CND-00004"]) {
  const html = await page("/product/" + sku);
  assert.ok(html.includes(mapping[sku]), sku + " product photo");
}
const seen = new Set();
for (const cat of ["ac-compressor", "ac-condenser"]) {
  const count = index.filter(
    (h) => (tax.bySku[h.sku]?.category || h.category) === cat && !tax.bySku[h.sku]?.hidden,
  ).length;
  for (let p = 1; p <= Math.ceil(count / 60); p++) {
    const html = await page(`/results?category=${cat}&page=${p}`);
    const articles = [...html.matchAll(/<article[\s\S]*?<\/article>/g)].map((m) => m[0]);
    assert.ok(articles.length > 0);
    for (const article of articles) {
      const sku = article.match(/href="\/product\/(HZ-[A-Z]+-\d+)"/)?.[1];
      if (sku && mapping[sku]) {
        assert.ok(article.includes(mapping[sku]), sku + " exact approved image on listing");
        seen.add(sku);
      }
    }
  }
}
assert.equal(seen.size, 898, "all approved photos resolve in product listings");
console.log(
  "PASS AC photos: 898 exact approved SKU WebPs/hash/bytes; 670 compressors+228 condensers; 649 needs-source excluded from new map; both product pages, all category pages and listing cards (order is deals-then-price, see check-listing-sort.mjs); readonly cwd, zero network",
);
