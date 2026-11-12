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
function catalogPrice(sku) {
  if (!sku) return null;
  const override = priceOverrides[sku];
  if (typeof override === "number" && Number.isFinite(override) && override > 0) return override;
  if (hiddenPrices.has(sku)) return null;
  const v = pricesBySku[sku];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

// Mirrors src/lib/home-deals.ts — monthly-deals carousel SKUs.
const DEAL_SKUS = new Set([
  "HZ-BRK-00248",
  "HZ-BRK-00680",
  "HZ-BRK-00449",
  "HZ-CMP-00014",
  "HZ-CMP-00047",
  "HZ-OIL-00011",
  "HZ-GEN-04977",
  "HZ-CND-00001",
]);

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
    const ga = DEAL_SKUS.has(a.hit.sku) ? 0 : 1;
    const gb = DEAL_SKUS.has(b.hit.sku) ? 0 : 1;
    if (ga !== gb) return ga - gb;
    return cmp(a, b, priceAsc);
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

const brakeDeals = recBrakes.filter((h) => DEAL_SKUS.has(h.sku));
assert.deepEqual(
  brakeDeals.map((h) => h.sku),
  ["HZ-BRK-00248", "HZ-BRK-00680", "HZ-BRK-00449"],
  "brakes recommended starts with monthly-deal SKUs cheapest-first",
);
assert.deepEqual(
  recBrakes.slice(0, 3).map((h) => h.sku),
  ["HZ-BRK-00248", "HZ-BRK-00680", "HZ-BRK-00449"],
);

assertGroupPriceAsc(recBrakes, (h) => DEAL_SKUS.has(h.sku));
assertGroupPriceAsc(recBrakes, (h) => !DEAL_SKUS.has(h.sku));
assertGroupPriceAsc(recFluids, (h) => DEAL_SKUS.has(h.sku));
assertGroupPriceAsc(recFluids, (h) => !DEAL_SKUS.has(h.sku));
assertGroupPriceAsc(recFilters, (h) => DEAL_SKUS.has(h.sku));
assertGroupPriceAsc(recFilters, (h) => !DEAL_SKUS.has(h.sku));
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

// fluids deal HZ-OIL-00011 comes first when present
const fluidDeals = recFluids.filter((h) => DEAL_SKUS.has(h.sku)).map((h) => h.sku);
if (fluidDeals.length) {
  assert.equal(recFluids[0].sku, fluidDeals[0], "fluids recommended starts with the monthly deal");
}

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
        note: "No new-arrival flag in the catalog; recommended is deals then price only.",
      },
      dealsSource: "homeDealsSkus (מבצעי החודש carousel)",
      brakesFirst: recBrakes.slice(0, 5).map((h) => ({ sku: h.sku, price: catalogPrice(h.sku), deal: DEAL_SKUS.has(h.sku) })),
      fluidsFirst: recFluids.slice(0, 5).map((h) => ({ sku: h.sku, price: catalogPrice(h.sku), deal: DEAL_SKUS.has(h.sku) })),
      filtersFirst: recFilters.slice(0, 5).map((h) => ({ sku: h.sku, price: catalogPrice(h.sku), deal: DEAL_SKUS.has(h.sku) })),
    },
    null,
    2,
  ),
);
console.log("PASS listing sort: deals-then-price default, price sorts, visible prices, no-price last");
