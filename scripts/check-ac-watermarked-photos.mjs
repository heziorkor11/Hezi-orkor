import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url),
  folder = "ac-watermarked-2026-11-08";
const json = async (p) => JSON.parse(await readFile(new URL(p, root), "utf8"));
const mapping = await json(`public/catalog/images/${folder}.json`),
  sources = await json(`public/catalog/images/${folder}-sources.json`);
assert.equal(Object.keys(mapping).length, 216);
assert.equal(sources.added, 216);
assert.equal(sources.excludedCount, 297);
assert.equal(sources.watermarkLabelCandidates, 233);
assert.deepEqual(sources.excludedReasonCounts, {
  drawing: 278,
  "wrong-content": 18,
  "bad-background": 1,
});
assert.equal(sources.visualExcludedCount, 17);
assert.ok(sources.excluded.every((e) => !Object.hasOwn(mapping, e.sku)));
assert.deepEqual(sources.categoryCounts, { "ac-compressor": 89, "ac-condenser": 127 });
const backgroundAudit = await json("public/catalog/images/ac-watermarked-background-audit.json");
assert.equal(backgroundAudit.checked,216);
assert.deepEqual(backgroundAudit.flagged,[]);
assert.equal(backgroundAudit.all.length,216);
for (const p of sources.products) {
  const audit = backgroundAudit.all.find(a=>a.sku===p.sku);
  assert.ok(audit);
  assert.deepEqual(audit.size,[1200,1200]);
  assert.equal(audit.sha256,p.sha256);
  assert.ok(Math.min(...audit.outerBorderMean)>=245);
  assert.ok(Math.max(...audit.outerBorderMean)-Math.min(...audit.outerBorderMean)<=3);
  assert.equal(p.watermarkKept, true);
  assert.match(p.decodedRgbSha256, /^[a-f0-9]{64}$/);
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
for (const sku of ["HZ-CND-00033", "HZ-CND-00359"]) {
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
assert.equal(seen.size, 216, "all approved photos resolve in product listings");
console.log(
  "PASS preserved watermark photos: 216 exact approved SKU WebPs/hash/bytes; 89 compressors+127 condensers; 297 drawings/wrong-content/background excluded; watermarks retained; white-border/dimensions audit; both product pages, all category pages and global image-first ordering; readonly cwd, zero network",
);
