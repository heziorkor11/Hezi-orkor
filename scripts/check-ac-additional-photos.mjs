import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url),
  folder = "ac-additional-2026-11-08";
const json = async (p) => JSON.parse(await readFile(new URL(p, root), "utf8"));
const mapping = await json(`public/catalog/images/${folder}.json`),
  sources = await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(Object.keys(mapping).length, 133);
assert.equal(sources.added, 133);
assert.equal(sources.skippedNeedsSource, 516);
assert.deepEqual(sources.categoryCounts, { "ac-compressor": 102, "ac-condenser": 31 });
assert.deepEqual(sources.statusCounts, { "ok-ai-upscaled": 126, ok: 7 });
assert.equal(sources.alreadyWiredApproved, 898);
const prior = await json("public/catalog/images/ac-approved-2026-11-08.json");
assert.ok(Object.keys(mapping).every((sku) => !Object.hasOwn(prior, sku)));
for (const p of sources.products) {
  assert.ok(["ok", "ok-ai-upscaled"].includes(p.designerStatus));
  assert.ok(p.designerMethod);
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
for (const sku of ["HZ-CMP-00001", "HZ-CND-00001"]) {
  const html = await page("/product/" + sku);
  assert.ok(html.includes(mapping[sku]), sku + " product photo");
}
const seen = new Set();
for (const cat of ["ac-compressor", "ac-condenser"]) {
  const count = index.filter(
    (h) => (tax.bySku[h.sku]?.category || h.category) === cat && !tax.bySku[h.sku]?.hidden,
  ).length;
  let placeholder = false;
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
      if (article.includes("data-product-placeholder")) placeholder = true;
      else assert.equal(placeholder, false, "photo after placeholder across " + cat + " pages");
    }
  }
}
assert.equal(seen.size, 133, "all approved photos resolve in product listings");
console.log(
  "PASS additional approved AC photos (126 AI-upscaled + 7 background fixes): 133 exact approved SKU WebPs/hash/bytes; 102 compressors+31 condensers; 516 needs-source excluded from new map; both product pages, all category pages and global image-first ordering; readonly cwd, zero network",
);
