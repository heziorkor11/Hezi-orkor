import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import type { SearchHit } from "./catalog-types.ts";
import { productFitsVehicle } from "./search-intent.ts";
import {
  AUDI_MAKE,
  VW_MAKE,
  applyPolMakeFitments,
  classifyPolMakes,
  hasPolMakeAbbrev,
  summarizePolMakeCounts,
} from "./pol-makes.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function hit(partial: Partial<SearchHit> & { title: string; sku?: string }): SearchHit {
  return {
    sku: partial.sku || "HZ-TEST-00000",
    title: partial.title,
    titleOriginal: partial.titleOriginal,
    category: partial.category || "general",
    oe: partial.oe || "",
    make: partial.make,
    model: partial.model,
    yearFrom: partial.yearFrom,
    yearTo: partial.yearTo,
    fitments: partial.fitments,
  };
}

test("hasPolMakeAbbrev ignores פולו, כפול, פול לד and pulley פול'", () => {
  assert.equal(hasPolMakeAbbrev("נאבה פול טוארג קדמי"), true);
  assert.equal(hasPolMakeAbbrev("נאבה פולו אחורי"), false);
  assert.equal(hasPolMakeAbbrev("נאבה שברולט פורד F350 קדמי מ10 כפול"), false);
  assert.equal(hasPolMakeAbbrev("פנס ראשי מגאן מ17 פול לד L"), false);
  assert.equal(hasPolMakeAbbrev("מדחס בובקט TM13 פול' 12V 4PV מקורי"), false);
});

test("VW-only פול items stay Volkswagen and do not match Audi", () => {
  const touareg = hit({
    sku: "HZ-GEN-03411",
    title: "נאבה פול טוארג קדמי+אחורי מ10",
    make: VW_MAKE,
    model: "טוארג",
    fitments: [{ make: VW_MAKE, model: "טוארג", yearFrom: 2010, yearTo: 2018 }],
  });
  assert.equal(classifyPolMakes(touareg), "volkswagen");
  assert.equal(productFitsVehicle(touareg, VW_MAKE), true);
  assert.equal(productFitsVehicle(touareg, AUDI_MAKE), false);

  const lt = hit({ sku: "HZ-GEN-05411", title: "משאבת מים פול LT46 נ2.8TDI מ02 עד06", make: VW_MAKE, model: "LT 46 TDI" });
  assert.equal(classifyPolMakes(lt), "volkswagen");
  assert.equal(productFitsVehicle(lt, VW_MAKE), true);
  assert.equal(productFitsVehicle(lt, AUDI_MAKE), false);

  const classic = hit({ sku: "HZ-FLT-00638", title: "פילטר סולר פול פ.קלסיק D מ00" });
  assert.equal(classifyPolMakes(classic), "volkswagen");
});

test("Audi-only פול items, including ones mis-tagged as VW, match Audi only", () => {
  const mistagged = hit({
    sku: "HZ-GEN-03408",
    title: "נאבה פול A5 קדמי+אחורי מ09 ללא מיסב",
    make: VW_MAKE,
    model: "A5",
    fitments: [{ make: VW_MAKE, model: "A5", yearFrom: 2009, yearTo: 2009 }],
  });
  assert.equal(classifyPolMakes(mistagged), "audi");
  assert.equal(productFitsVehicle(mistagged, AUDI_MAKE), true);
  assert.equal(productFitsVehicle(mistagged, VW_MAKE), false);
  const makes = new Set(applyPolMakeFitments(mistagged).map((e) => e.make));
  assert.deepEqual([...makes].sort(), [AUDI_MAKE]);

  const eighty = hit({ sku: "HZ-BRK-00876", title: "צלחת בלם פול 80 אחורי מ88 +ABS", make: VW_MAKE, model: "80" });
  assert.equal(classifyPolMakes(eighty), "audi");
  assert.equal(productFitsVehicle(eighty, AUDI_MAKE), true);
  assert.equal(productFitsVehicle(eighty, VW_MAKE), false);

  const etron = hit({ sku: "HZ-BRK-01660", title: "רפידות בלם פול אי טרון אחורי מ19", make: VW_MAKE, model: "אי טרון" });
  assert.equal(classifyPolMakes(etron), "audi");
  assert.equal(productFitsVehicle(etron, AUDI_MAKE), true);
});

test("items that list both makes, or Polo plus Audi models, match both without duplicating the SKU", () => {
  const bothTitle = hit({
    sku: "HZ-PLUG-00251",
    title: "מצת פול פולו 1.0 מ16 A1 A4 מ16",
    make: VW_MAKE,
    model: "גולף",
    fitments: [{ make: VW_MAKE, model: "גולף", yearFrom: 0, yearTo: 0 }],
  });
  assert.equal(classifyPolMakes(bothTitle), "both");
  assert.equal(productFitsVehicle(bothTitle, VW_MAKE), true);
  assert.equal(productFitsVehicle(bothTitle, AUDI_MAKE), true);
  const entries = applyPolMakeFitments(bothTitle);
  assert.ok(entries.some((e) => e.make === VW_MAKE));
  assert.ok(entries.some((e) => e.make === AUDI_MAKE));

  const listed = hit({
    sku: "HZ-GEN-03413",
    title: "נאבה פול פסאט אחורי מ97 עד05",
    make: VW_MAKE,
    model: "פאסאט",
    fitments: [
      { make: VW_MAKE, model: "פאסאט", yearFrom: 1996, yearTo: 2005 },
      { make: AUDI_MAKE, model: "A6", yearFrom: 1997, yearTo: 2005 },
    ],
  });
  assert.equal(classifyPolMakes(listed), "both");
  assert.equal(productFitsVehicle(listed, VW_MAKE), true);
  assert.equal(productFitsVehicle(listed, AUDI_MAKE), true);
});

test("Passat A4 / A3 generation codes stay Volkswagen, not Audi A4", () => {
  const passatGen = hit({
    sku: "HZ-GEN-05046",
    title: "פילטר גיר פול פסאט A4 מ96 A3 עד03",
    make: VW_MAKE,
    model: "פסאט A4",
    fitments: [{ make: VW_MAKE, model: "פסאט A4", yearFrom: 1992, yearTo: 1996 }],
  });
  assert.equal(classifyPolMakes(passatGen), "volkswagen");
  assert.equal(productFitsVehicle(passatGen, VW_MAKE), true);
  assert.equal(productFitsVehicle(passatGen, AUDI_MAKE), false);
});

test("foreign-make titles with a leftover פול token are left unchanged", () => {
  const porsche = hit({
    sku: "HZ-FLT-00462",
    title: "פילטר אוויר פול פורשה פנמרה מ10 עד16",
    make: "פורשה",
    model: "פנמרה",
  });
  assert.equal(classifyPolMakes(porsche), "none");
  const entries = applyPolMakeFitments(porsche);
  assert.ok(entries.every((e) => e.make !== VW_MAKE && e.make !== AUDI_MAKE));

  const megane = hit({ sku: "HZ-HDL-03130", title: "פנס ראשי מגאן מ17 פול לד L", make: VW_MAKE, model: "לד" });
  assert.equal(classifyPolMakes(megane), "none");
});

test("do not invent a model when adding the second make", () => {
  const ambiguous = hit({ sku: "HZ-TEST-AMB", title: "משאבת מים פול מ02 עד06" });
  assert.equal(classifyPolMakes(ambiguous), "both");
  const entries = applyPolMakeFitments(ambiguous);
  const added = entries.filter((e) => e.make === VW_MAKE || e.make === AUDI_MAKE);
  assert.ok(added.length >= 2);
  assert.ok(added.every((e) => e.model === ""));
});

test("catalog counts: VW-only, Audi-only, and both, with no SKU duplication", () => {
  const hits = JSON.parse(readFileSync(join(root, "public/catalog/search-index.json"), "utf8")) as SearchHit[];
  const counts = summarizePolMakeCounts(hits);
  assert.ok(counts.polToken > 400, `expected a large פול set, got ${counts.polToken}`);
  assert.ok(counts.volkswagen >= 180, `vw ${counts.volkswagen}`);
  assert.ok(counts.audi >= 130, `audi ${counts.audi}`);
  assert.ok(counts.both >= 150, `both ${counts.both}`);
  // Every classified product is a single SKU that can carry two makes.
  const seen = new Set<string>();
  for (const item of hits) {
    const kind = classifyPolMakes(item);
    if (kind === "none") continue;
    assert.equal(seen.has(item.sku), false, `duplicate sku ${item.sku}`);
    seen.add(item.sku);
    const makes = new Set(applyPolMakeFitments(item).map((e) => e.make));
    if (kind === "both") {
      assert.ok(makes.has(VW_MAKE) && makes.has(AUDI_MAKE), `${item.sku} ${item.title}`);
    } else if (kind === "volkswagen") {
      assert.ok(makes.has(VW_MAKE), item.sku);
    } else if (kind === "audi") {
      assert.ok(makes.has(AUDI_MAKE), item.sku);
      assert.equal(productFitsVehicle(item, VW_MAKE), false, `audi-only leaked to VW: ${item.sku} ${item.title}`);
    }
  }
  // eslint-style report for the operator
  console.log(
    `פול make counts: VW-only=${counts.volkswagen} Audi-only=${counts.audi} both=${counts.both} (פול-token titles=${counts.polToken}; both also includes items that list both makes without a פול token)`,
  );
});
