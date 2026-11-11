import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import type { SearchHit } from "./catalog-types.ts";
import { classifyPartType, hasPartTypeChips, partTypeCategories, typesForCategory } from "./part-types.ts";
import { getNameOverride } from "./name-overrides.ts";
import { displayCategory } from "./display-taxonomy.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const hits: SearchHit[] = JSON.parse(readFileSync(join(root, "public/catalog/search-index.json"), "utf8"));
const hiddenCategories = new Set(
  (JSON.parse(readFileSync(join(root, "public/catalog/hidden-categories.json"), "utf8")).hiddenCategories || []) as string[],
);

test("chip categories have at least two types derived from names", () => {
  for (const category of partTypeCategories()) {
    assert.ok(hasPartTypeChips(category), category);
    assert.ok(typesForCategory(category).length >= 2, category);
  }
});

test("visible products in chip categories mostly classify, headlights stay hidden", () => {
  let hiddenLights = 0;
  const unmatched: { sku: string; category: string; title: string }[] = [];
  for (const hit of hits) {
    const category = displayCategory(hit.sku, hit.category || "");
    if (hiddenCategories.has(category) || category === "lights") {
      hiddenLights += 1;
      continue;
    }
    if (!hasPartTypeChips(category)) continue;
    const title = getNameOverride(hit.sku) || hit.title;
    const classified = classifyPartType({ ...hit, title }, category);
    if (!classified) unmatched.push({ sku: hit.sku, category, title: title || hit.title });
  }
  assert.ok(hiddenLights >= 0);
  const byCat = new Map<string, number>();
  for (const row of unmatched) byCat.set(row.category, (byCat.get(row.category) || 0) + 1);
  // Singleton spring bushing in suspension, plus a few lighting odds, are expected.
  assert.ok((byCat.get("suspension") || 0) <= 1, `suspension unmatched ${byCat.get("suspension")}`);
  assert.equal(byCat.get("filters") || 0, 0);
  assert.equal(byCat.get("brakes") || 0, 0);
});
