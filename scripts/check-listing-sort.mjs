import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const catalog = new URL("public/catalog/", root);

async function json(path) {
  return JSON.parse(await readFile(new URL(path, catalog), "utf8"));
}

async function typed(path) {
  const code = ts.transpileModule(await readFile(new URL(path, root), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
}

const { hasRealProductImage } = await typed("src/lib/product-image-policy.ts");
const { imageLooksLikeSharedOe } = await typed("src/lib/part-display.ts");

const pricesBySku = await json("prices.json");
const hiddenPrices = new Set(((await json("price-hide-overrides.json").catch(() => ({ skus: [] }))).skus) || []);
function catalogPrice(sku) {
  if (!sku || hiddenPrices.has(sku)) return null;
  const v = pricesBySku[sku];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

function sortHits(hits, mode, hasImage) {
  const decorated = hits.map((hit, index) => ({ hit, index }));
  const priceAsc = (sku) => {
    const p = catalogPrice(sku);
    return p == null ? [1, 0] : [0, p];
  };
  const priceDesc = (sku) => {
    const p = catalogPrice(sku);
    return p == null ? [1, 0] : [0, -p];
  };
  decorated.sort((a, b) => {
    if (mode === "price-asc") {
      const [am, ap] = priceAsc(a.hit.sku),
        [bm, bp] = priceAsc(b.hit.sku);
      if (am !== bm) return am - bm;
      if (ap !== bp) return ap - bp;
      return a.index - b.index;
    }
    if (mode === "price-desc") {
      const [am, ap] = priceDesc(a.hit.sku),
        [bm, bp] = priceDesc(b.hit.sku);
      if (am !== bm) return am - bm;
      if (ap !== bp) return ap - bp;
      return a.index - b.index;
    }
    if (mode === "newest") return b.index - a.index;
    const ia = hasImage(a.hit) ? 0 : 1,
      ib = hasImage(b.hit) ? 0 : 1;
    if (ia !== ib) return ia - ib;
    const [am, ap] = priceAsc(a.hit.sku),
      [bm, bp] = priceAsc(b.hit.sku);
    if (am !== bm) return am - bm;
    if (ap !== bp) return ap - bp;
    return a.index - b.index;
  });
  return decorated.map((d) => d.hit);
}

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
    /* optional */
  }
}
const usable = (value) =>
  Boolean(
    value &&
      !value.startsWith("/products/") &&
      !(value.startsWith("/catalog/") && !value.startsWith("/catalog/images/")) &&
      !/\/photos\/?$/.test(value),
  );
const taxonomy = await json("display-taxonomy.json");
const index = await json("search-index.json");
const hasImage = (hit) =>
  usable(maps[hit.sku]) &&
  !imageLooksLikeSharedOe(maps[hit.sku], hit.oe) &&
  hasRealProductImage(maps[hit.sku]);

function categoryHits(category) {
  return index.filter(
    (h) => (taxonomy.bySku[h.sku]?.category || h.category) === category && !taxonomy.bySku[h.sku]?.hidden,
  );
}

function report(label, hits) {
  return hits.slice(0, 5).map((h) => ({
    sku: h.sku,
    title: h.title,
    price: catalogPrice(h.sku),
    hasImage: hasImage(h),
  }));
}

const compressor = categoryHits("ac-compressor");
assert.equal(compressor.length, 916, "מדחס מזגן count");
const brakes = categoryHits("brakes");
assert.ok(brakes.length > 100, "brakes sample category");

const recComp = sortHits(compressor, "recommended", hasImage);
const ascComp = sortHits(compressor, "price-asc", hasImage);
const recBrakes = sortHits(brakes, "recommended", hasImage);
const ascBrakes = sortHits(brakes, "price-asc", hasImage);

// Recommended: all imaged before non-imaged
let seenPlaceholder = false;
for (const h of recComp) {
  if (!hasImage(h)) seenPlaceholder = true;
  else assert.equal(seenPlaceholder, false, "recommended: photo after placeholder");
}
// Within imaged prefix, prices non-decreasing (nulls only after priced)
const imaged = recComp.filter(hasImage);
const priced = imaged.map((h) => catalogPrice(h.sku));
let seenNull = false;
let prev = -Infinity;
for (const p of priced) {
  if (p == null) {
    seenNull = true;
    continue;
  }
  assert.equal(seenNull, false, "null price in middle of imaged priced block");
  assert.ok(p >= prev, "recommended imaged prices ascending");
  prev = p;
}

// price-asc: global ascending, nulls last
const ascPrices = ascComp.map((h) => catalogPrice(h.sku));
let nulls = false;
prev = -Infinity;
for (const p of ascPrices) {
  if (p == null) {
    nulls = true;
    continue;
  }
  assert.equal(nulls, false, "priced item after null in price-asc");
  assert.ok(p >= prev, "price-asc ascending");
  prev = p;
}

// Runtime HTML order matches
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

assert.deepEqual(
  skus(await page("/results?category=ac-compressor")),
  recComp.slice(0, 60).map((h) => h.sku),
  "default recommended order on מדחס מזגן page 1",
);
assert.deepEqual(
  skus(await page("/results?category=ac-compressor&sort=price-asc")),
  ascComp.slice(0, 60).map((h) => h.sku),
  "price-asc order on מדחס מזגן page 1",
);
assert.deepEqual(
  skus(await page("/results?category=brakes")),
  recBrakes.slice(0, 60).map((h) => h.sku),
  "recommended brakes page 1",
);
assert.deepEqual(
  skus(await page("/results?category=brakes&sort=price-asc")),
  ascBrakes.slice(0, 60).map((h) => h.sku),
  "price-asc brakes page 1",
);

const out = {
  saleNewFields: {
    onSale: false,
    compareAt: false,
    createdAt: false,
    newBadge: false,
    note: "No sale/new fields on Product or prices.json; recommended skips those groups.",
  },
  acCompressor: {
    recommendedFirst5: report("rec", recComp),
    priceAscFirst5: report("asc", ascComp),
  },
  brakes: {
    recommendedFirst5: report("rec", recBrakes),
    priceAscFirst5: report("asc", ascBrakes),
  },
};
await import("node:fs/promises").then((fs) =>
  fs.writeFile(new URL("../artifacts/listing-sort-verify.json", root), JSON.stringify(out, null, 2)),
);
console.log(JSON.stringify(out, null, 2));
console.log("PASS listing sort: recommended + price-asc verified for ac-compressor and brakes");
