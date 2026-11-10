import assert from "node:assert/strict";
import { test } from "node:test";
import { matchAxle, matchHand, parseViscosity } from "./tile-facets.ts";

test("parseViscosity reads standard engine grades and ignores gear oil", () => {
  assert.equal(parseViscosity("שמן מנוע 5W-30 טויוטה"), "5W-30");
  assert.equal(parseViscosity("שמן מנוע 5W30 EDGE"), "5W-30");
  assert.equal(parseViscosity("0W-20 0.96L"), "0W-20");
  assert.equal(parseViscosity("שמן גיר 75W-90"), undefined);
  assert.equal(parseViscosity("משאבת מים 65W-13"), undefined);
  assert.equal(parseViscosity("רפידות קדמי"), undefined);
});

test("matchAxle uses קדמי/אחורי and skips both", () => {
  assert.equal(matchAxle("צלחת בלם אופל אינסיגניה 1.4 קדמי"), "front");
  assert.equal(matchAxle("צלחת בלם אופל אסטרה אחורי"), "rear");
  assert.equal(matchAxle("רפידות קד' מאזדה"), "front");
  assert.equal(matchAxle("בלם קדמי ואחורי"), undefined);
  assert.equal(matchAxle("משאבת מים אופל"), undefined);
});

test("matchHand uses L/R tokens and ignores RAV4 / CR-V", () => {
  assert.equal(matchHand("קצה הגה אופל אסטרה L"), "left");
  assert.equal(matchHand("קצה הגה אופל אסטרה R"), "right");
  assert.equal(matchHand("ציריה ימין"), "right");
  assert.equal(matchHand("ציריה שמאל"), "left");
  assert.equal(matchHand("זרוע קדמית טויוטה RAV4"), undefined);
  assert.equal(matchHand("בולם הונדה CR-V"), undefined);
  assert.equal(matchHand("בולם הונדה CR V"), undefined);
  assert.equal(matchHand("קצה הגה L/R"), undefined);
});
