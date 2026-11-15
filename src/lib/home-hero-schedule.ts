/**
 * Hero schedule and countdown, always in Asia/Jerusalem.
 * startDate / endDate are calendar days (YYYY-MM-DD) in Israel, inclusive.
 */

import type { HomeHeroSlide, HeroTimerPosition } from "./home-hero";

export const IL_TZ = "Asia/Jerusalem";
export const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isYmd(value: string | undefined): value is string {
  return Boolean(value && YMD_RE.test(value));
}

function israelParts(at: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

export function israelYmd(at: Date = new Date()): string {
  const p = israelParts(at);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** UTC instant of YYYY-MM-DD 00:00:00 in Asia/Jerusalem. */
export function startOfIsraelDay(ymd: string): number {
  if (!isYmd(ymd)) return Number.NaN;
  for (const offset of ["+02:00", "+03:00"] as const) {
    const t = Date.parse(`${ymd}T00:00:00${offset}`);
    if (Number.isNaN(t)) continue;
    const back = israelParts(new Date(t));
    const backYmd = `${back.year}-${String(back.month).padStart(2, "0")}-${String(back.day).padStart(2, "0")}`;
    if (backYmd === ymd && back.hour === 0 && back.minute === 0 && back.second === 0) return t;
  }
  return Date.parse(`${ymd}T00:00:00+02:00`);
}

/** Exclusive UTC instant of the next Israel calendar day (end of ymd is this minus 1ms). */
export function startOfNextIsraelDay(ymd: string): number {
  const start = startOfIsraelDay(ymd);
  if (Number.isNaN(start)) return Number.NaN;
  // 26–30 hours later is always the next calendar day in Israel; scan down to the first tick of that day.
  const nextYmdGuess = israelYmd(new Date(start + 36 * 60 * 60 * 1000));
  const nextStart = startOfIsraelDay(nextYmdGuess);
  if (!Number.isNaN(nextStart) && nextStart > start) return nextStart;
  return start + 24 * 60 * 60 * 1000;
}

export function endOfIsraelDayInclusive(ymd: string): number {
  return startOfNextIsraelDay(ymd) - 1;
}

export function isSlideScheduledActive(slide: Pick<HomeHeroSlide, "hidden" | "startDate" | "endDate">, now: Date = new Date()): boolean {
  if (slide.hidden) return false;
  const t = now.getTime();
  if (isYmd(slide.startDate) && t < startOfIsraelDay(slide.startDate)) return false;
  if (isYmd(slide.endDate) && t > endOfIsraelDayInclusive(slide.endDate)) return false;
  return true;
}

export function isSlideScheduleEnded(slide: Pick<HomeHeroSlide, "endDate">, now: Date = new Date()): boolean {
  return isYmd(slide.endDate) && now.getTime() > endOfIsraelDayInclusive(slide.endDate);
}

export function visibleHeroSlides(slides: HomeHeroSlide[], now: Date = new Date(), fallback?: HomeHeroSlide): HomeHeroSlide[] {
  const visible = slides.filter((s) => isSlideScheduledActive(s, now));
  if (visible.length) return visible;
  return fallback ? [{ ...fallback, hidden: false, timerEnabled: false, startDate: undefined, endDate: undefined }] : [];
}

export type CountdownParts = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

export function countdownToIsraelEnd(endDate: string, now: Date = new Date()): CountdownParts {
  const end = isYmd(endDate) ? endOfIsraelDayInclusive(endDate) : Number.NaN;
  const totalMs = Number.isNaN(end) ? 0 : end - now.getTime();
  if (totalMs <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const totalSec = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { totalMs, days, hours, minutes, seconds, expired: false };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Hebrew countdown, e.g. "נשארו 2 ימים 05:12:30". */
export function formatCountdownHe(parts: CountdownParts): string {
  const clock = `${pad2(parts.hours)}:${pad2(parts.minutes)}:${pad2(parts.seconds)}`;
  return `נשארו ${parts.days} ימים ${clock}`;
}

export function slideShowsTimer(slide: Pick<HomeHeroSlide, "timerEnabled" | "endDate" | "hidden">, now: Date = new Date()): boolean {
  return Boolean(slide.timerEnabled && isYmd(slide.endDate) && isSlideScheduledActive(slide, now));
}

export function timerPositionOf(slide: Pick<HomeHeroSlide, "timerPosition">): HeroTimerPosition {
  return slide.timerPosition === "button" || slide.timerPosition === "bottom" ? slide.timerPosition : "top";
}

const MONTH_HE = ["בינו׳", "בפבר׳", "במרץ", "באפר׳", "במאי", "ביוני", "ביולי", "באוג׳", "בספט׳", "באוק׳", "בנוב׳", "בדצמ׳"];

export function formatYmdShortHe(ymd: string): string {
  if (!isYmd(ymd)) return ymd;
  const [, m, d] = ymd.split("-");
  const month = MONTH_HE[Number(m) - 1] || m;
  return `${Number(d)} ${month}`;
}

export function formatScheduleRangeHe(startDate?: string, endDate?: string): string {
  if (isYmd(startDate) && isYmd(endDate)) {
    if (startDate === endDate) return formatYmdShortHe(startDate);
    const [, sm] = startDate.split("-");
    const [, em] = endDate.split("-");
    if (sm === em) return `${Number(startDate.slice(8))}–${formatYmdShortHe(endDate)}`;
    return `${formatYmdShortHe(startDate)}–${formatYmdShortHe(endDate)}`;
  }
  if (isYmd(endDate)) return `עד ${formatYmdShortHe(endDate)}`;
  if (isYmd(startDate)) return `מ־${formatYmdShortHe(startDate)}`;
  return "";
}
