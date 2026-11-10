import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const rail = await readFile(new URL("src/components/home-category-rail.tsx", root), "utf8");
assert.match(rail, /VISUAL_CATEGORIES\.map/);
assert.match(rail, /data-home-category-photo/);
assert.match(rail, /to="\/results"/);
assert.ok(!rail.includes('hash="categories"'));
assert.ok(!rail.includes('href="#categories"'));
const homeRoute = await readFile(new URL("src/routes/index.tsx", root), "utf8");
assert.ok(!homeRoute.includes("HomeSearchHero"));
assert.ok(!homeRoute.includes("home-search-hero"));
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
assert.match(home, /data-home-category-photo/);
assert.match(home, /home-cat-squircle/);
assert.doesNotMatch(home, /id="home-sku-search"/);
assert.doesNotMatch(home, /חפשו חלק/);
assert.match(home, /לכל הקטגוריות/);
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
assert.match(css, /home-cat-squircle/);
console.log(
  "PASS mobile image balance: home category rail (squircles, all-categories links to /results); no duplicate חפשו חלק search; emitted product cards cap 220px, detail 300px; contain/no overlays; generated CSS verified. Browser pixel measurement still requires mobile QA.",
);
