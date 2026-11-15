import assert from "node:assert/strict";
import { test } from "node:test";
import { CERTAIN_MODEL_SPELLINGS, SEARCH_SPELLING_FOLDS, foldCertainModelSpelling } from "./model-spelling.ts";
import { sameModel } from "./model-names.ts";
import { commercialNameVariants, mapMotVehicle } from "./mot-map-vehicle.ts";
import { parseSearchIntent, productFitsVehicle, tokensMatchHit } from "./search-intent.ts";
import type { SearchHit } from "./catalog-types.ts";

// Real fitments from the catalog (15.11.2026): 17 parts say "אטצ'ה", one spark plug says "אטקה".
const brakeDisc: SearchHit = {
  sku: "HZ-BRK-00821",
  title: "צלחת בלם סקודה אוקטביה אחורי מ20",
  category: "brakes",
  oe: "",
  fitments: [{ make: "סיאט", model: "אטצ'ה", yearFrom: 2016, yearTo: 2025 }],
};
const sparkPlug: SearchHit = {
  sku: "HZ-PLUG-00215",
  title: "מצת סקודה אוקטביה 1.5 מ-19+קודיאק 1.5 מ-19",
  category: "spark-plugs",
  oe: "",
  fitments: [
    { make: "סיאט", model: "אטקה", yearFrom: 2021, yearTo: 2024 },
    { make: "סיאט", model: "לאון", yearFrom: 2018, yearTo: 2024 },
  ],
};

test("MOT ATECA XPERIENCE drops the trim suffix and maps to SEAT Ateca", () => {
  assert.ok(commercialNameVariants("סיאט", "ATECA XPERIENCE").includes("ATECA"));
  assert.ok(commercialNameVariants("סיאט", "ATECA XPERIENCE", "XPERIENCE").includes("ATECA"));
  const v = mapMotVehicle({ manufacturer: "סיאט צ'כיה", commercialName: "ATECA XPERIENCE", trim: "XPERIENCE", year: 2021 });
  assert.equal(v.mapping.confidence, "mapped");
  assert.equal(v.mapping.make, "סיאט");
  assert.ok(["אטקה", "אטצ'ה"].includes(v.mapping.model || ""), v.mapping.model);
  assert.equal(v.mapping.year, "2021");
});

test("plate result for Ateca lists both spellings (אטצ'ה and אטקה)", () => {
  const v = mapMotVehicle({ manufacturer: "סיאט צ'כיה", commercialName: "ATECA XPERIENCE", trim: "XPERIENCE", year: 2021 });
  const { make, model, year } = v.mapping;
  assert.equal(productFitsVehicle(brakeDisc, make, model, year), true);
  assert.equal(productFitsVehicle(sparkPlug, make, model, year), true);
  assert.equal(productFitsVehicle(brakeDisc, "סיאט", "אטקה"), true);
  assert.equal(productFitsVehicle(sparkPlug, "סיאט", "אטצ'ה"), true);
});

test("free-text search treats אטקה and אטצ'ה as the same model", () => {
  const intent = parseSearchIntent("צלחת בלם סיאט אטקה");
  assert.ok(tokensMatchHit(brakeDisc, intent.restTokens.filter((t) => t !== "צלחת" && t !== "בלם")));
  assert.equal(tokensMatchHit(brakeDisc, ["אטקה"]), true);
  assert.equal(tokensMatchHit(sparkPlug, ["אטצה"]), true);
});

test("Corolla mapping is unchanged", () => {
  const v = mapMotVehicle({ manufacturer: "טויוטה טורקיה", commercialName: "COROLLA SDN HSD", trim: "SENSE", year: 2023 });
  assert.equal(v.mapping.confidence, "mapped");
  assert.equal(v.mapping.model, "קורולה");
});

test("certain spellings fold only inside the same make", () => {
  assert.equal(sameModel("סיאט", "ליאון", "לאון"), true);
  assert.equal(sameModel("רנו", "סוניק", "סניק"), true);
  assert.equal(sameModel("טויוטה", "קמרי", "קאמרי"), true);
  assert.equal(sameModel("ניסאן", "נברה", "נווארה"), true);
  // Chevrolet Sonic is a real, different car: no fold outside Renault.
  assert.equal(sameModel("שברולט", "סוניק", "סניק"), false);
  assert.equal(foldCertainModelSpelling("שברולט", "סוניק"), "סוניק");
});

test("different vehicles stay different", () => {
  assert.equal(sameModel("ג'יפ", "שירוקי", "גרנד שירוקי"), false);
  assert.equal(sameModel("רנו", "סניק", "גרנד סוניק"), false);
  assert.equal(sameModel("טויוטה", "יאריס", "אוריס"), false);
  assert.equal(sameModel("פיאט", "בראבה", "בראבו"), false);
  assert.equal(sameModel("טויוטה", "פריוס", "פרואייס"), false);
  assert.equal(sameModel("פורשה", "קאיין", "קאיימן"), false);
});

test("spelling table has no chains and search folds have no conflicts", () => {
  for (const [make, table] of Object.entries(CERTAIN_MODEL_SPELLINGS)) {
    for (const to of Object.values(table)) {
      assert.equal(table[to.toLowerCase()] ?? table[to], undefined, `${make}: ${to} is both a target and a key`);
    }
  }
  for (const to of Object.values(SEARCH_SPELLING_FOLDS)) {
    assert.equal(SEARCH_SPELLING_FOLDS[to], undefined, `search fold chain on ${to}`);
  }
  assert.equal(SEARCH_SPELLING_FOLDS["סוניק"], undefined);
  assert.equal(SEARCH_SPELLING_FOLDS["אטצה"], "אטקה");
});
