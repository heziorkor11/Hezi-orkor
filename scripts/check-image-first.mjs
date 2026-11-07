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
for (const p of new Set([1, Math.floor(realCount / 60) + 1, Math.ceil(expected.length / 60)])) {
  const actual = skus(await page("/results?category=brakes&page=" + p));
  assert.deepEqual(
    actual,
    expected.slice((p - 1) * 60, p * 60),
    "stable global partition BEFORE pagination, page " + p,
  );
}
const fluidsOriginal = index.filter(
  (h) =>
    (taxonomy.bySku[h.sku]?.category || h.category) === "fluids" && !taxonomy.bySku[h.sku]?.hidden,
);
const fluidsExpected = imagesFirst(fluidsOriginal, hasImage).map((h) => h.sku);
for (const p of [1, 2]) {
  const actual = skus(await page("/results?category=fluids&page=" + p));
  assert.deepEqual(actual, fluidsExpected.slice((p - 1) * 60, p * 60), "fluids page " + p);
  assert.ok(actual.length > 0);
}
const query = "תוספים";
const additiveOriginal = index.filter(
  (h) =>
    (taxonomy.bySku[h.sku]?.category || h.category) === "additives" &&
    !taxonomy.bySku[h.sku]?.hidden,
);
assert.deepEqual(
  skus(await page("/results?q=" + encodeURIComponent(query))),
  imagesFirst(additiveOriginal, hasImage).map((h) => h.sku),
);
assert.equal(additiveOriginal.length, 17);
assert.equal(skus(await page("/results?category=additives")).length, 17);
for (const path of [
  "/",
  "/results?category=brakes",
  "/results?q=" + encodeURIComponent(query),
  "/product/HZ-BRK-00001",
]) {
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
  `PASS image-first: shared placeholder policy; stable non-mutating partition; ${realCount}/${original.length} brake products with photos; first/transition/last pages match global order; Hebrew search and featured cards; readonly/no network.`,
);
