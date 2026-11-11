import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import ts from "typescript";
const root = new URL("../", import.meta.url),
  catalog = new URL("public/catalog/", root);
async function json(path) {
  return JSON.parse(await readFile(new URL(path, catalog), "utf8"));
}
async function typed(path) {
  const code = ts.transpileModule(await readFile(new URL(path, root), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
}
const { hasRealProductImage, imagesFirst } = await typed("src/lib/product-image-policy.ts");
const { imageLooksLikeSharedOe } = await typed("src/lib/part-display.ts");
const fixture = [
  { id: "a", image: undefined },
  { id: "b", image: "/catalog/images/real.webp" },
  { id: "c", image: "/placeholder.jpg" },
  { id: "d", image: "https://brand.test/real.jpg" },
];
assert.deepEqual(
  imagesFirst(fixture, (p) => hasRealProductImage(p.image)).map((p) => p.id),
  ["b", "d", "a", "c"],
);
assert.deepEqual(
  fixture.map((p) => p.id),
  ["a", "b", "c", "d"],
  "never mutate source/relevance order",
);
for (const image of [
  undefined,
  "",
  "/images/parts/brake.png",
  "/catalog/category-photos/brakes.jpg",
  "/generic.jpg",
  "/no-image.png",
])
  assert.equal(hasRealProductImage(image), false);
const manifest = await json("images/manifest.json");
let maps = {};
for (const file of [
  "images-a.json",
  "images-b.json",
  "images-galor.json",
  "images-hot.json",
  "images-new.json",
  ...manifest.files.map((f) => "images/" + f),
]) {
  try {
    Object.assign(maps, await json(file));
  } catch {
    /* optional malformed legacy map has same fallback as runtime */
  }
}
const taxonomy = await json("display-taxonomy.json"),
  index = await json("search-index.json");
const usable = (value) =>
  Boolean(
    value &&
    !value.startsWith("/products/") &&
    !(value.startsWith("/catalog/") && !value.startsWith("/catalog/images/")) &&
    !/\/photos\/?$/.test(value),
  );
const chunks = (
  await Promise.all(
    (await readdir(new URL("chunks/", catalog)))
      .filter((f) => f.endsWith(".json"))
      .map((f) => json("chunks/" + f)),
  )
).flat();
// Current source-only images are all rejected representative /products images.
// Fail rather than silently mis-rank if a future importer adds real raw images to rows without search metadata.
assert.ok(
  chunks.every((p) => !usable(p.image)),
  "new usable raw images require search-ranking metadata support",
);
const hasImage = (hit) =>
  usable(maps[hit.sku]) &&
  !imageLooksLikeSharedOe(maps[hit.sku], hit.oe) &&
  hasRealProductImage(maps[hit.sku]);
const original = index.filter(
  (h) =>
    (taxonomy.bySku[h.sku]?.category || h.category) === "brakes" && !taxonomy.bySku[h.sku]?.hidden,
);
const expected = imagesFirst(original, hasImage).map((h) => h.sku);
const realCount = original.filter(hasImage).length;
assert.ok(
  realCount > 60 && realCount < original.length,
  "test must span image and placeholder pages",
);
const handler = new URL(".vercel/output/functions/__server.func/index.mjs", root);
process.env.VERCEL = "1";
process.chdir("/proc");
globalThis.fetch = async () => {
  throw new Error("network forbidden");
};
const { default: app } = await import(handler.href);
async function page(path) {
  let r = await app.fetch(new Request("http://local.invalid" + path));
  for (let i = 0; i < 3 && [301, 302, 303, 307, 308].includes(r.status); i++)
    r = await app.fetch(new Request(new URL(r.headers.get("location"), "http://local.invalid")));
  assert.equal(r.status, 200, path);
  return r.text();
}
function skus(html) {
  return [...new Set([...html.matchAll(/href="\/product\/(HZ-[A-Z]+-\d+)"/g)].map((m) => m[1]))];
}
const fluidsOriginal = index.filter(
  (h) =>
    (taxonomy.bySku[h.sku]?.category || h.category) === "fluids" && !taxonomy.bySku[h.sku]?.hidden,
);
const query = "תוספים";
const additiveOriginal = index.filter(
  (h) =>
    (taxonomy.bySku[h.sku]?.category || h.category) === "additives" &&
    !taxonomy.bySku[h.sku]?.hidden,
);
assert.equal(additiveOriginal.length, 17);
const additivesPage = skus(await page("/results?category=additives"));
assert.equal(additivesPage.length, 17);
assert.deepEqual(
  new Set(skus(await page("/results?q=" + encodeURIComponent(query)))),
  new Set(additiveOriginal.map((h) => h.sku)),
  "Hebrew additives search returns the additives category set",
);
const fluidsPage1 = skus(await page("/results?category=fluids"));
const fluidsPage2 = skus(await page("/results?category=fluids&page=2"));
assert.equal(fluidsOriginal.length, 92);
assert.equal(fluidsPage1.length, 60, "fluids page 1 size");
assert.equal(fluidsPage2.length, 32, "fluids page 2 size");
assert.equal(new Set([...fluidsPage1, ...fluidsPage2]).size, 92);
void expected; // listing order is now deals-then-price; asserted in check-listing-sort.mjs
// Home featured + related products still use image-first. Listing pages do not.
for (const path of ["/", "/product/HZ-BRK-00001"]) {
  const html = await page(path);
  const flags = [...html.matchAll(/<article[\s\S]*?<\/article>/g)].map(
    ([article]) => !article.includes("data-product-placeholder"),
  );
  assert.ok(
    flags.every((v, i) => v || !flags.slice(i + 1).includes(true)),
    path + " must not put a real photo after a placeholder",
  );
}
console.log(
  `PASS image-first: shared placeholder policy; non-mutating helper; ${realCount}/${original.length} brake products with photos; fluids 60+32/92; Hebrew additives search 17; home/related stay image-first; readonly/no network.`,
);
