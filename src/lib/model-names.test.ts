import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalModel, expandCertainModel, foldModelSpelling, sameModel } from "./model-names.ts";

test("ג שירוקי and ג.שירוקי expand to גרנד שירוקי for display", () => {
  assert.equal(canonicalModel("ג'יפ", "ג שירוקי"), "גרנד שירוקי");
  assert.equal(canonicalModel("ג'יפ", "ג.שירוקי"), "גרנד שירוקי");
  assert.equal(canonicalModel("ג'יפ", "ג' שירוקי"), "גרנד שירוקי");
  assert.equal(canonicalModel("ג'יפ", "ג שירוקי 05 10 מק'"), "גרנד שירוקי");
  assert.equal(canonicalModel("ג'יפ", "ג שירוקי 05 10 חל'"), "גרנד שירוקי");
  assert.equal(canonicalModel("ג'יפ", "ג.צירוקי 3.6 מ 11"), "גרנד שירוקי");
  assert.equal(expandCertainModel("מדחס ג'יפ ג.שירוקי 05-10"), "מדחס ג'יפ גרנד שירוקי 05-10");
});

test("plain שירוקי stays Cherokee, not Grand Cherokee", () => {
  assert.equal(canonicalModel("ג'יפ", "שירוקי"), "שירוקי");
  assert.equal(canonicalModel("ג'יפ", "שירוקי KL"), "שירוקי KL");
  assert.equal(sameModel("ג'יפ", "גרנד שירוקי", "שירוקי"), false);
  assert.equal(sameModel("ג'יפ", "שירוקי", "גרנד שירוקי"), false);
  assert.equal(sameModel("ג'יפ", "ג שירוקי", "שירוקי"), false);
  assert.equal(sameModel("ג'יפ", "שירוקי KL", "גרנד שירוקי"), false);
});

test("sameModel matches Grand spelling and trim variants, not a different vehicle", () => {
  assert.equal(sameModel("ג'יפ", "ג שירוקי 05 10 מק'", "גרנד שירוקי"), true);
  assert.equal(sameModel("ג'יפ", "גרנד צ'ירוקי", "גרנד שירוקי"), true);
  assert.equal(sameModel("ג'יפ", "גרנד צ'רוקי WK", "גרנד שירוקי"), true);
  assert.equal(sameModel("ג'יפ", "גרנד שירוקי WK2", "גרנד שירוקי"), true);
  assert.equal(sameModel("ג'יפ", "צ'ירוקי", "שירוקי"), true);
  assert.equal(sameModel("ג'יפ", "צירוקי", "שירוקי"), true);
});

test("other Grand / Space models do not leak into the short name", () => {
  assert.equal(canonicalModel("פיאט", "ג.פונטו"), "גרנד פונטו");
  assert.equal(sameModel("פיאט", "גרנד פונטו", "פונטו"), false);
  assert.equal(sameModel("סוזוקי", "ג.ויטרה", "ויטרה"), false);
  assert.equal(sameModel("רנו", "ג.סניק", "סניק"), false);
  assert.equal(sameModel("מיצובישי", "ס.וגון", "וואגון"), false);
  assert.equal(sameModel("לנד רובר", "ריינג' רובר ספורט", "ריינג' רובר"), false);
  assert.equal(sameModel("פולקסווגן", "פולו קלאסיק", "פולו"), false);
  assert.equal(sameModel("פיאט", "ג.פונטו", "גרנד פונטו"), true);
});

test("foldModelSpelling unifies Cherokee spellings without adding גרנד", () => {
  assert.equal(foldModelSpelling("צ'ירוקי"), "שירוקי");
  assert.equal(foldModelSpelling("צ'רוקי"), "שירוקי");
  assert.equal(foldModelSpelling("צירוקי"), "שירוקי");
  assert.equal(foldModelSpelling("גרנד צ'רוקי"), "גרנד שירוקי");
  assert.equal(foldModelSpelling("שירוקי"), "שירוקי");
});
