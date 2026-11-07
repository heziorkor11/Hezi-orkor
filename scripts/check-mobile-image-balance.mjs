import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const hero = await readFile(new URL("src/components/home-search-hero.tsx", root), "utf8");
assert.match(hero, /grid grid-cols-2 gap-2\.5/);
assert.match(hero, /VISUAL_CATEGORIES\.slice\(0, 6\)/);
assert.match(hero, /href="#categories"/);
assert.ok(!hero.includes('className="mx-auto mb-1.5 h-20 w-full object-contain"'));
// Container arithmetic, not a claimed browser measurement: 14px outer gutters,
// 10px grid gap; quick links have 2px border + 8px padding, image is absolute/full.
for (const viewport of [360, 390, 400, 430]) {
  const quickPhoto = (viewport - 28 - 10) / 2 - 10;
  assert.ok(quickPhoto >= 150, `${viewport}px: quick photo ${quickPhoto}px`);
}
const handler = new URL(".vercel/output/functions/__server.func/index.mjs", root);
process.env.VERCEL = "1";
process.chdir("/proc");
globalThis.fetch = async () => {
  throw new Error("network forbidden");
};
const { default: app } = await import(handler.href);
async function page(path) {
  const r = await app.fetch(new Request("http://local.invalid" + path));
  assert.equal(r.status, 200);
  return r.text();
}
const home = await page("/");
assert.match(home, /data-home-category-photo[^>]*aspect-square/);
assert.match(home, /href="#categories"/);
const results = await page("/results?category=fluids");
assert.match(results, /data-product-photo[^>]*max-h-\[220px\]/);
assert.match(results, /data-product-fitment[^>]*class="border-t/);
assert.match(results, /object-contain/);
for (const [article] of results.matchAll(/<article[\s\S]*?<\/article>/g)) assert.doesNotMatch(article, /bg-gradient-to-t|pb-16/);
const detail = await page("/product/HZ-OIL-00011");
assert.match(detail, /data-product-photo[^>]*max-h-\[300px\]/);
const assets = new URL(".vercel/output/static/assets/", root);
const css = (
  await Promise.all(
    (await readdir(assets))
      .filter((n) => n.endsWith(".css"))
      .map((n) => readFile(new URL(n, assets), "utf8")),
  )
).join("\n");
assert.match(css, /max-height:220px/);
assert.match(css, /max-height:300px/);
console.log(
  "PASS mobile image balance: 2-column quick categories, calculated photo widths 151–186px at 360–430px; full grid retained; emitted product cards cap 220px, detail 300px; contain/no overlays; generated CSS verified. Browser pixel measurement still requires mobile QA.",
);
