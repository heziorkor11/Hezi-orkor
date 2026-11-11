import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import type { ProductFilter, SearchHit, VehicleFitment } from "./catalog-types.ts";
import {
  mergeFilterWithIntent,
  productFitsVehicle,
  tokensMatchHit,
  typeAllows,
  looksLikePartNumber,
  sameMake,
} from "./search-intent.ts";
import { classifyPartType, selectedPartType } from "./part-types.ts";

type Row = {
  sku: string;
  title: string;
  make?: string;
  category: string;
  sub?: string;
  fitmentMakes: string[];
};

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const hits = JSON.parse(readFileSync(join(root, "public/catalog/search-index.json"), "utf8"));
const taxonomy = JSON.parse(readFileSync(join(root, "public/catalog/display-taxonomy.json"), "utf8"));
const hiddenCategories = new Set(
  JSON.parse(readFileSync(join(root, "public/catalog/hidden-categories.json"), "utf8")).hiddenCategories || [],
);
const bySku = taxonomy.bySku || {};

function displayCategory(sku: string, fallback: string) {
  return bySku[sku]?.category || fallback;
}

function normalizeDisplayCategory(category?: string) {
  return category && ["oil-filter", "cabin-filter"].includes(category) ? "filters" : category;
}

function isHidden(sku: string) {
  const ov = bySku[sku];
  if (!ov) return false;
  if (hiddenCategories.has(ov.category)) return true;
  return Boolean(ov.hidden);
}

function partNumberMatches(hit: SearchHit, q: string) {
  const compact = String(q || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const sku = String(hit.sku || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const oe = String(hit.oe || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  if (!compact) return false;
  return sku === compact || sku.startsWith(compact) || oe.includes(compact);
}

export function hitMatches(hit: SearchHit, state: ProductFilter) {
  if (isHidden(hit.sku)) return false;
  const merged = mergeFilterWithIntent(state);
  const category = displayCategory(hit.sku, hit.category || "general");
  const sub = bySku[hit.sku]?.sub;
  const filterCategory = normalizeDisplayCategory(merged.category);
  const chipType = selectedPartType(merged);
  if (chipType) {
    if (classifyPartType(hit, merged.category) !== chipType) return false;
  } else if (merged.sub && sub !== merged.sub) {
    return false;
  }
  if (merged.allowed.length && !typeAllows(category, sub, merged.allowed)) return false;
  if (filterCategory && category !== filterCategory) return false;
  if (merged.make || merged.model || merged.year) {
    if (!productFitsVehicle(hit, merged.make, merged.model, merged.year)) return false;
  }
  if (merged.q) {
    if (merged.isPartNumber || looksLikePartNumber(merged.q)) {
      if (!partNumberMatches(hit, merged.q)) return false;
    } else if (!tokensMatchHit(hit, merged.restTokens)) {
      return false;
    }
  }
  return true;
}

function search(state: ProductFilter) {
  return hits.filter((hit: SearchHit) => hitMatches(hit, state)).map((hit: SearchHit) => ({
    sku: hit.sku,
    title: hit.title,
    make: hit.make,
    category: displayCategory(hit.sku, hit.category),
    sub: bySku[hit.sku]?.sub,
    fitmentMakes: [...new Set((hit.fitments || []).map((f: VehicleFitment) => f.make).filter(Boolean) as string[])],
  }));
}

function fitsMake(row: Row, make: string) {
  if (sameMake(row.make, make)) return true;
  if ((row.fitmentMakes || []).some((m: string) => sameMake(m, make))) return true;
  const blob = `${row.title || ""} ${row.make || ""}`;
  return sameMake(make, "דאצ'יה")
    ? /דאצ|דצי|dacia/i.test(blob)
    : blob.includes(make);
}

const CASES = [
  {
    name: "פילטר מזגן דאציה",
    state: { q: "פילטר מזגן דאציה" },
    expect: (rows: Row[]) => {
      assert.ok(rows.length > 0, "should find cabin filters for Dacia");
      for (const row of rows) {
        assert.equal(row.category, "filters", row.sku);
        assert.equal(row.sub, "cabin", `${row.sku} ${row.title}`);
        assert.ok(fitsMake(row, "דאצ'יה"), `${row.sku} ${row.title} ${row.make}`);
      }
    },
  },
  {
    name: "פילטר מזגן לדאציה",
    state: { q: "פילטר מזגן לדאציה" },
    expect: (rows: Row[]) => {
      assert.ok(rows.length > 0);
      assert.ok(rows.every((row: Row) => row.sub === "cabin" && fitsMake(row, "דאצ'יה")));
    },
  },
  {
    name: "פילטר מזגן",
    state: { q: "פילטר מזגן" },
    expect: (rows: Row[]) => {
      assert.ok(rows.length >= 265, `expected all cabin filters, got ${rows.length}`);
      const foreign = rows.filter((row: Row) => row.sub !== "cabin");
      assert.equal(foreign.length, 0, `air/diesel leaked: ${foreign.slice(0, 3).map((r: Row) => r.title).join(" | ")}`);
    },
  },
  {
    name: "filters category + דאציה",
    state: { category: "filters", q: "דאציה" },
    expect: (rows: Row[]) => {
      assert.ok(rows.length > 0);
      assert.ok(rows.length < 50, `should not return all filters, got ${rows.length}`);
      for (const row of rows) {
        assert.equal(row.category, "filters", row.sku);
        assert.ok(fitsMake(row, "דאצ'יה"), `${row.sku} ${row.title}`);
      }
    },
  },
  {
    name: "filters category + make selector דאציה",
    state: { category: "filters", make: "דאציה" },
    expect: (rows: Row[]) => {
      assert.ok(rows.length > 0);
      assert.ok(rows.every((row: Row) => row.category === "filters" && fitsMake(row, "דאצ'יה")));
    },
  },
  {
    name: "רפידות טויוטה",
    state: { q: "רפידות טויוטה" },
    expect: (rows: Row[]) => {
      assert.ok(rows.length > 0);
      for (const row of rows) {
        assert.equal(row.category, "brakes", row.sku);
        assert.equal(row.sub, "pads", `${row.sku} ${row.title}`);
        assert.ok(fitsMake(row, "טויוטה"), `${row.sku} ${row.title}`);
      }
    },
  },
  {
    name: "מסנן שמן קיה",
    state: { q: "מסנן שמן קיה" },
    expect: (rows: Row[]) => {
      assert.ok(rows.length > 0);
      for (const row of rows) {
        assert.equal(row.category, "filters", row.sku);
        assert.equal(row.sub, "oil", `${row.sku} ${row.title}`);
        assert.ok(fitsMake(row, "קיה"), `${row.sku} ${row.title}`);
      }
    },
  },
  {
    name: "SKU HZ-CND-00537",
    state: { q: "HZ-CND-00537" },
    expect: (rows: Row[]) => {
      assert.equal(rows.length, 1);
      assert.equal(rows[0].sku, "HZ-CND-00537");
    },
  },
  {
    name: "generic פילטר returns every filter type, not only cabin",
    state: { q: "פילטר" },
    expect: (rows: Row[]) => {
      assert.ok(rows.length > 200, `expected all filters, got ${rows.length}`);
      const subs = new Set(rows.map((row) => row.sub).filter(Boolean));
      for (const sub of ["cabin", "air", "oil", "diesel", "gear"]) {
        assert.ok(subs.has(sub), `missing ${sub} in generic filter search`);
      }
    },
  },
  {
    name: "type=air on פילטר keeps only air filters",
    state: { q: "פילטר", type: "air" },
    expect: (rows: Row[]) => {
      assert.ok(rows.length > 0);
      for (const row of rows) {
        assert.equal(row.category, "filters", row.sku);
        assert.equal(row.sub, "air", `${row.sku} ${row.title}`);
      }
    },
  },
  {
    name: "empty: unknown make should not fall back to unrelated items",
    state: { q: "פילטר מזגן זקסמון" },
    expect: (rows: Row[]) => {
      assert.equal(rows.length, 0);
    },
  },
];

export function reportCounts() {
  return CASES.map((testCase) => ({
    name: testCase.name,
    count: search(testCase.state).length,
  }));
}

for (const testCase of CASES) {
  test(testCase.name, () => {
    const rows = search(testCase.state);
    console.log(`  → ${testCase.name}: ${rows.length} results`);
    testCase.expect(rows);
  });
}

if (process.argv.includes("--report")) {
  console.log(JSON.stringify(reportCounts(), null, 2));
}
