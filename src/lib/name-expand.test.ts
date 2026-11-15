import assert from "node:assert/strict";
import { test } from "node:test";
import { expandProductName } from "./name-expand.ts";

test("certain leftover abbreviations expand in product titles", () => {
  assert.match(expandProductName("מדחס ג'יפ ג.שירוקי 05-10 מקורי").name, /גרנד שירוקי/);
  assert.equal(expandProductName("מעבה גי'פ ג.שירוקי NRF 00-04").name, "מעבה ג'יפ גרנד שירוקי NRF 00-04");
  assert.match(expandProductName("פילטר שמן פיאט פונטו ספיס+500+ג.פונטו").name, /גרנד פונטו/);
  assert.equal(expandProductName("מ. מים סובארו XV נ2.0 מ18 YAMADA").name, "משאבת מים סובארו XV נ2.0 מ18 YAMADA");
  assert.match(expandProductName("פנס ראשי מ.קופר קאונטרימן מ16לדL").name, /מיני קופר/);
  assert.match(expandProductName("צלחת בלם פול טוארג קדמי ק.גלגל \"17").name, /קוטר גלגל/);
  assert.match(expandProductName("פנס ראשי 00>01 A6 קסנ' L").name, /קסנון/);
  assert.match(expandProductName("פנס ראשי קורולה 04<03 5ד' L RNX").name, /5 דלתות/);
});

test("קס' and פול are left untouched", () => {
  const xenon = expandProductName("פנס ראשי 00>01 A6 קס' L");
  assert.equal(xenon.changed, false);
  assert.match(xenon.name, /קס'/);
  assert.equal(xenon.name.includes("קסנון"), false);

  const vw = expandProductName("נאבה פול טוארג קדמי+אחורי מ10");
  assert.equal(vw.name.includes("פולקסווגן"), false);
  assert.match(vw.name, /פול טוארג/);

  const audi = expandProductName("נאבה פול A6 אחורי מ05 עד10");
  assert.equal(audi.name.includes("אאודי"), false);
  assert.match(audi.name, /פול A6/);
});
