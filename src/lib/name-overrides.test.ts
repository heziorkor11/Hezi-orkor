import assert from "node:assert/strict";
import test from "node:test";
import { applySearchHitNameOverride, getNameOverride } from "./name-overrides.ts";

test("applies confirmed name overrides and skips doubtful SKUs", () => {
  assert.equal(
    getNameOverride("HZ-BRK-00001"),
    "צלחות בלם קדמיות לאופל אינסיגניה 1.4, 2017 ואילך",
  );
  assert.ok(getNameOverride("HZ-OIL-00001")?.startsWith("שמן מנוע Motul"));
  assert.ok(getNameOverride("HZ-CAF-00004")?.startsWith("פילטר מזגן"));
  // Yellow / note-doubt rows must not be overridden.
  assert.equal(getNameOverride("HZ-BRK-00036"), undefined);
  assert.equal(getNameOverride("HZ-OIL-00015"), undefined);
  assert.equal(getNameOverride("HZ-CAF-00001"), undefined);
  assert.equal(getNameOverride("HZ-CMP-00149"), undefined);
});

test("search hits keep the previous title as titleOriginal", () => {
  const hit = applySearchHitNameOverride({
    sku: "HZ-BRK-00001",
    title: "צלחת בלם אופל אינסיגניה 1.4 קדמי מ17",
    category: "brakes",
    oe: "",
  });
  assert.equal(hit.title, "צלחות בלם קדמיות לאופל אינסיגניה 1.4, 2017 ואילך");
  assert.equal(hit.titleOriginal, "צלחת בלם אופל אינסיגניה 1.4 קדמי מ17");
  assert.equal(hit.category, "brakes");
});
