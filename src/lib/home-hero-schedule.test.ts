import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countdownToIsraelEnd,
  endOfIsraelDayInclusive,
  formatCountdownHe,
  formatScheduleRangeHe,
  isSlideScheduleEnded,
  isSlideScheduledActive,
  israelYmd,
  startOfIsraelDay,
  visibleHeroSlides,
} from "./home-hero-schedule.ts";
const help = {
  id: "help",
  title: "לא מצאת חלק?",
  subtitle: "שלחו תמונה או מק״ט בוואטסאפ — נאתר ונשלח הצעת מחיר",
  ctaLabel: "דברו איתנו",
  href: "/help",
  tone: "warm" as const,
  linkType: "help" as const,
};
const fallbackHelpSlide = { ...help, id: "help-fallback", hidden: false, timerEnabled: false, startDate: undefined, endDate: undefined };
const brakes = {
  id: "brakes",
  title: "בלמים ואביזרים",
  subtitle: "",
  ctaLabel: "לקטלוג בלמים",
  tone: "ember" as const,
  linkType: "category" as const,
  linkTarget: "brakes",
};
const ac = {
  id: "ac",
  title: "מדחסים ומעבים",
  subtitle: "",
  ctaLabel: "מדחס מזגן",
  tone: "ink" as const,
  linkType: "category" as const,
  linkTarget: "ac-compressor",
};

test("start of an Israel winter day is 00:00 IST (UTC+2)", () => {
  const t = startOfIsraelDay("2026-11-15");
  assert.equal(t, Date.parse("2026-11-14T22:00:00.000Z"));
  assert.equal(israelYmd(new Date(t)), "2026-11-15");
});

test("start of an Israel summer day is 00:00 IDT (UTC+3)", () => {
  const t = startOfIsraelDay("2026-07-15");
  assert.equal(t, Date.parse("2026-07-14T21:00:00.000Z"));
  assert.equal(israelYmd(new Date(t)), "2026-07-15");
});

test("end date is inclusive through 23:59:59.999 in Israel", () => {
  const end = endOfIsraelDayInclusive("2026-11-17");
  assert.equal(israelYmd(new Date(end)), "2026-11-17");
  assert.equal(israelYmd(new Date(end + 1)), "2026-11-18");
  // Winter: 23:59:59.999 IST = 21:59:59.999 UTC
  assert.ok(end > Date.parse("2026-11-17T21:59:59.000Z"));
  assert.ok(end < Date.parse("2026-11-17T22:00:01.000Z"));
});

test("a slide is inactive before its Israel start date and active at midnight", () => {
  const slide = { hidden: false, startDate: "2026-11-15", endDate: "2026-11-17" };
  assert.equal(isSlideScheduledActive(slide, new Date("2026-11-14T21:59:59.000Z")), false);
  assert.equal(isSlideScheduledActive(slide, new Date("2026-11-14T22:00:00.000Z")), true);
  assert.equal(isSlideScheduledActive(slide, new Date("2026-11-17T21:59:59.000Z")), true);
  assert.equal(isSlideScheduledActive(slide, new Date("2026-11-17T22:00:00.000Z")), false);
  assert.equal(isSlideScheduleEnded(slide, new Date("2026-11-17T22:00:00.000Z")), true);
});

test("hidden slides stay inactive even inside the window", () => {
  const slide = { hidden: true, startDate: "2026-11-15", endDate: "2026-11-17" };
  assert.equal(isSlideScheduledActive(slide, new Date("2026-11-16T10:00:00.000Z")), false);
});

test("slides without dates are active unless hidden", () => {
  assert.equal(isSlideScheduledActive({ hidden: false }, new Date("2026-11-16T10:00:00.000Z")), true);
  assert.equal(isSlideScheduledActive({ hidden: true }, new Date("2026-11-16T10:00:00.000Z")), false);
});

test("visible list falls back to the default help slide when nothing is active", () => {
  const hidden = [brakes, ac, help].map((s) => ({ ...s, hidden: true }));
  const visible = visibleHeroSlides(hidden, new Date("2026-11-16T10:00:00.000Z"), fallbackHelpSlide);
  assert.equal(visible.length, 1);
  assert.equal(visible[0]?.title, "לא מצאת חלק?");
  assert.equal(visible[0]?.timerEnabled, false);
  assert.equal(visible[0]?.id, "help-fallback");
});

test("visible list keeps order of active slides", () => {
  const slides = [
    { ...brakes, hidden: true },
    { ...ac },
    { ...help },
  ];
  const visible = visibleHeroSlides(slides, new Date(), fallbackHelpSlide);
  assert.deepEqual(visible.map((s) => s.id), ["ac", "help"]);
});

test("countdown formats as נשארו X ימים HH:MM:SS", () => {
  const end = "2026-11-17";
  const now = new Date(endOfIsraelDayInclusive(end) - (((2 * 24 + 5) * 60 + 12) * 60 + 30) * 1000);
  const parts = countdownToIsraelEnd(end, now);
  assert.equal(parts.expired, false);
  assert.equal(parts.days, 2);
  assert.equal(parts.hours, 5);
  assert.equal(parts.minutes, 12);
  assert.equal(parts.seconds, 30);
  assert.equal(formatCountdownHe(parts), "נשארו 2 ימים 05:12:30");
});

test("countdown is expired at and after the end instant", () => {
  const end = "2026-11-17";
  const parts = countdownToIsraelEnd(end, new Date(endOfIsraelDayInclusive(end) + 1));
  assert.equal(parts.expired, true);
  assert.equal(formatCountdownHe(parts), "נשארו 0 ימים 00:00:00");
});

test("schedule badge range uses short Hebrew months", () => {
  assert.equal(formatScheduleRangeHe("2026-11-15", "2026-11-17"), "15–17 בנוב׳");
});
