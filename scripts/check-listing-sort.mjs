import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const catalog = new URL("public/catalog/", root);

async function json(path) {
  return JSON.parse(await readFile(new URL(path, catalog), "utf8"));
}

const pricesBySku = await json("prices.json");
const hiddenPrices = new Set(
  ((await json("price-hide-overrides.json").catch(() => ({ skus: [] }))).skus) || [],
);
const priceOverrides =
  ((await json("price-overrides.json").catch(() => ({ bySku: {} }))).bySku) || {};
const taxonomyAll = await json("display-taxonomy.json");
const workshopPacks = new Set(
  Object.entries(taxonomyAll.bySku || {})
    .filter(([, v]) => v && v.category === "workshop-packs")
    .map(([sku]) => sku),
);
const nameOverrides = ((await json("name-overrides.json").catch(() => ({ bySku: {} }))).bySku) || {};
function ceilShekel(value) {
  if (!Number.isFinite(value) || value <= 0) return value;
  const cents = Math.round((value + Number.EPSILON) * 100);
  return Math.ceil(cents / 100 - 1e-12);
}
function catalogPrice(sku) {
  if (!sku) return null;
  if (workshopPacks.has(sku)) return null;
  const override = priceOverrides[sku];
  if (typeof override === "number" && Number.isFinite(override) && override > 0) return ceilShekel(override);
  if (hiddenPrices.has(sku)) return null;
  const v = pricesBySku[sku];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? ceilShekel(v) : null;
}

const listedImageFiles = ["images-a.json", "images-b.json", "images-hot.json", "images-new.json"];
const packManifest = await json("images/manifest.json").catch(() => ({ files: [] }));
const imageParts = await Promise.all(
  listedImageFiles
    .concat((packManifest.files || []).map((f) => "images/" + f))
    .map((f) => json(f).catch(() => ({}))),
);
const imageMap = Object.assign({}, ...imageParts);
function usableRaw(value) {
  if (!value) return false;
  if (value.startsWith("/products/")) return false;
  if (value.startsWith("/catalog/") && !value.startsWith("/catalog/images/")) return false;
  if (value.endsWith("/photos/") || value.endsWith("/photos")) return false;
  return true;
}
function hasRealProductImage(src) {
  return Boolean(
    src &&
      !/(?:placeholder|generic|no[-_]?image|no[-_]?photo|\/category-photos\/|\/images\/parts\/)/i.test(src),
  );
}
function imageLooksLikeSharedOe(image, oe) {
  if (!image) return false;
  if (image.startsWith("/products/")) return true;
  const m = image.match(/(\d{5,8})\.(?:jpe?g|png|webp)(?:\?|$)/i);
  if (!m) return false;
  return (oe || "").includes(m[1]);
}
function hitHasImage(hit) {
  const mapped = imageMap[hit.sku];
  const candidate = mapped && usableRaw(mapped) ? mapped : undefined;
  if (!candidate || imageLooksLikeSharedOe(candidate, hit.oe)) return false;
  return hasRealProductImage(candidate);
}
function hitName(hit) {
  return nameOverrides[hit.sku] || hit.title || hit.name || "";
}

function sortHits(hits, mode) {
  const decorated = hits.map((hit, index) => ({ hit, index }));
  const priceAsc = (sku) => {
    const p = catalogPrice(sku);
    return p == null ? [1, 0] : [0, p];
  };
  const priceDesc = (sku) => {
    const p = catalogPrice(sku);
    return p == null ? [1, 0] : [0, -p];
  };
  const cmp = (a, b, tuple) => {
    const [am, ap] = tuple(a.hit.sku);
    const [bm, bp] = tuple(b.hit.sku);
    if (am !== bm) return am - bm;
    if (ap !== bp) return ap - bp;
    return a.index - b.index;
  };
  decorated.sort((a, b) => {
    if (mode === "price-asc") return cmp(a, b, priceAsc);
    if (mode === "price-desc") return cmp(a, b, priceDesc);
    const ia = hitHasImage(a.hit) ? 0 : 1;
    const ib = hitHasImage(b.hit) ? 0 : 1;
    if (ia !== ib) return ia - ib;
    const byName = hitName(a.hit).localeCompare(hitName(b.hit), "he", { numeric: true, sensitivity: "base" });
    if (byName) return byName;
    return a.index - b.index;
  });
  return decorated.map((d) => d.hit);
}

function assertGroupPriceAsc(hits, inGroup) {
  const group = hits.filter(inGroup);
  let seenNull = false;
  let prev = -Infinity;
  for (const h of group) {
    const p = catalogPrice(h.sku);
    if (p == null) {
      seenNull = true;
      continue;
    }
    assert.equal(seenNull, false, "priced item after no-price inside a group");
    assert.ok(p >= prev, `price went backwards inside group: ${h.sku} ${p} < ${prev}`);
    prev = p;
  }
  if (group.length) {
    const lastPriced = [...group].reverse().find((h) => catalogPrice(h.sku) != null);
    const firstNull = group.find((h) => catalogPrice(h.sku) == null);
    if (lastPriced && firstNull) {
      assert.ok(
        group.indexOf(firstNull) > group.indexOf(lastPriced),
        "no-price items must follow priced items in the group",
      );
    }
  }
}

const taxonomy = await json("display-taxonomy.json");
const index = await json("search-index.json");

function categoryHits(category) {
  return index.filter(
    (h) =>
      (taxonomy.bySku[h.sku]?.category || h.category) === category && !taxonomy.bySku[h.sku]?.hidden,
  );
}

const brakes = categoryHits("brakes");
const fluids = categoryHits("fluids");
const filters = categoryHits("filters");
assert.ok(brakes.length > 100, "brakes sample category");
assert.ok(fluids.length > 20, "fluids/oils sample category");
assert.ok(filters.length > 20, "filters sample category");

const recBrakes = sortHits(brakes, "recommended");
const recFluids = sortHits(fluids, "recommended");
const recFilters = sortHits(filters, "recommended");
const ascBrakes = sortHits(brakes, "price-asc");
const descBrakes = sortHits(brakes, "price-desc");

function assertImageThenName(hits, label) {
  let seenNoImage = false;
  let prevName = "";
  let prevHadImage = true;
  for (const h of hits) {
    const has = hitHasImage(h);
    if (!has) seenNoImage = true;
    else assert.equal(seenNoImage, false, label + " imaged item after a no-image item: " + h.sku);
    const name = hitName(h);
    if (has === prevHadImage && prevName) {
      assert.ok(
        prevName.localeCompare(name, "he", { numeric: true, sensitivity: "base" }) <= 0,
        label + " name went backwards: " + prevName + " -> " + name,
      );
    }
    prevName = name;
    prevHadImage = has;
  }
}
assertImageThenName(recBrakes, "brakes recommended");
assertImageThenName(recFluids, "fluids recommended");
assertImageThenName(recFilters, "filters recommended");
assertGroupPriceAsc(ascBrakes, () => true);

// price-desc: priced descending, no-price last, deals not special
let seenNull = false;
let prev = Infinity;
for (const h of descBrakes) {
  const p = catalogPrice(h.sku);
  if (p == null) {
    seenNull = true;
    continue;
  }
  assert.equal(seenNull, false, "priced item after no-price in price-desc");
  assert.ok(p <= prev, "price-desc must be descending");
  prev = p;
}

// monthly deals stay on the home carousel only; listing default is image then name

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
function articles(html) {
  return [...html.matchAll(/<article[\s\S]*?<\/article>/g)].map((m) => m[0]);
}
function assertPricesVisible(html, path) {
  const cards = articles(html);
  assert.ok(cards.length > 0, path + " has product cards");
  for (const card of cards) {
    const hasPrice = card.includes("₪") || card.includes("צור קשר להצעת מחיר");
    assert.ok(hasPrice, path + " card missing a visible price/quote label");
  }
}

const cases = [
  ["/results?category=brakes", recBrakes],
  ["/results?category=fluids", recFluids],
  ["/results?category=filters", recFilters],
  ["/results?category=brakes&sort=price-asc", ascBrakes],
  ["/results?category=brakes&sort=price-desc", descBrakes],
];
for (const [path, expected] of cases) {
  const html = await page(path);
  assert.deepEqual(skus(html), expected.slice(0, 60).map((h) => h.sku), path + " page 1 order");
  assertPricesVisible(html, path);
  assert.match(html, /data-listing-sort/);
  assert.match(html, /מחיר: מהזול ליקר/);
  assert.match(html, /מחיר: מהיקר לזול/);
}

// last page of brakes recommended: trailing items without a price stay last
const brakePages = Math.max(1, Math.ceil(recBrakes.length / 60));
const lastHtml = await page("/results?category=brakes&page=" + brakePages);
const lastSkus = skus(lastHtml);
const expectedLast = recBrakes.slice((brakePages - 1) * 60).map((h) => h.sku);
assert.deepEqual(lastSkus, expectedLast, "brakes last page order");
const lastPrices = lastSkus.map((s) => catalogPrice(s));
if (lastPrices.some((p) => p == null)) {
  const firstNull = lastPrices.findIndex((p) => p == null);
  assert.ok(
    lastPrices.slice(firstNull).every((p) => p == null),
    "no-price products must be at the end of the last page",
  );
}

const packs = categoryHits("workshop-packs");
assert.ok(packs.length > 20, "workshop-packs sample category");
const recPacks = sortHits(packs, "recommended");
assertImageThenName(recPacks, "workshop-packs recommended");
assert.ok(hitHasImage(recPacks[0]), "workshop-packs start with a photographed product");
const packHtml = await page("/results?category=workshop-packs");
assert.match(packHtml, /מחיר מיוחד למוסכים וספקים/);
const packCards = articles(packHtml);
assert.ok(packCards.length > 0, "workshop-packs has product cards");
for (const card of packCards) {
  assert.match(card, /מחיר מיוחד למוסכים וספקים/, "workshop-packs card must not show a numeric price");
  assert.doesNotMatch(card, /\d+\s*₪/, "workshop-packs card leaked a shekel price");
}

// sort is kept on page 2
const p2 = await page("/results?category=brakes&sort=price-desc&page=2");
assert.deepEqual(
  skus(p2),
  descBrakes.slice(60, 120).map((h) => h.sku),
  "price-desc page 2 keeps sort",
);
assert.match(p2, /sort=price-desc/);

console.log(
  JSON.stringify(
    {
      newArrivalFields: {
        createdAt: false,
        isNew: false,
        note: "No new-arrival or popularity flag in the catalog; recommended is image-first then name.",
      },
      defaultSort: "image-first then name (he); no popularity signal in the catalog",
      brakesFirst: recBrakes.slice(0, 5).map((h) => ({ sku: h.sku, price: catalogPrice(h.sku), image: hitHasImage(h), name: hitName(h) })),
      fluidsFirst: recFluids.slice(0, 5).map((h) => ({ sku: h.sku, price: catalogPrice(h.sku), image: hitHasImage(h), name: hitName(h) })),
      filtersFirst: recFilters.slice(0, 5).map((h) => ({ sku: h.sku, price: catalogPrice(h.sku), image: hitHasImage(h), name: hitName(h) })),
    },
    null,
    2,
  ),
);
console.log("PASS listing sort: image-then-name default, price sorts, visible prices, no-price last");
