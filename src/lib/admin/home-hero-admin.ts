import {
  defaultHomeHeroSlides,
  hrefForSlide,
  type HeroLinkType,
  type HeroTimerPosition,
  type HeroTone,
  type HomeHeroSlide,
} from "@/lib/home-hero";
import { isYmd } from "@/lib/home-hero-schedule";

const LINK_TYPES: HeroLinkType[] = ["category", "product", "search", "whatsapp", "help"];
const TONES: HeroTone[] = ["ember", "ink", "warm"];
const POSITIONS: HeroTimerPosition[] = ["top", "button", "bottom"];

function asString(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function asId(v: unknown): string {
  return asString(v, 40).toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export function newHeroSlideId(): string {
  const n = Math.random().toString(36).slice(2, 10);
  return `s-${n}`;
}

export function normalizeHeroSlide(input: unknown, fallback?: HomeHeroSlide): HomeHeroSlide | null {
  if (!input || typeof input !== "object") return fallback ? { ...fallback } : null;
  const raw = input as Record<string, unknown>;
  const id = asId(raw.id) || fallback?.id || newHeroSlideId();
  if (!id) return null;
  const linkType = LINK_TYPES.includes(raw.linkType as HeroLinkType)
    ? (raw.linkType as HeroLinkType)
    : fallback?.linkType;
  const tone = TONES.includes(raw.tone as HeroTone) ? (raw.tone as HeroTone) : fallback?.tone || "ember";
  const timerPosition = POSITIONS.includes(raw.timerPosition as HeroTimerPosition)
    ? (raw.timerPosition as HeroTimerPosition)
    : fallback?.timerPosition || "top";
  const startDate = isYmd(asString(raw.startDate, 10)) ? asString(raw.startDate, 10) : undefined;
  const endDate = isYmd(asString(raw.endDate, 10)) ? asString(raw.endDate, 10) : undefined;
  const slide: HomeHeroSlide = {
    id,
    title: asString(raw.title, 80) || fallback?.title || "שקופית חדשה",
    subtitle: asString(raw.subtitle, 200) || fallback?.subtitle || "",
    ctaLabel: asString(raw.ctaLabel, 40) || fallback?.ctaLabel || "לפרטים",
    imageKey: asString(raw.imageKey, 40) || fallback?.imageKey,
    imageUrl: asString(raw.imageUrl, 200) || fallback?.imageUrl,
    imagePath: asString(raw.imagePath, 200) || fallback?.imagePath,
    tone,
    hidden: Boolean(raw.hidden),
    startDate,
    endDate,
    timerEnabled: Boolean(raw.timerEnabled),
    timerPosition,
    linkType,
    linkTarget: asString(raw.linkTarget, 80) || fallback?.linkTarget,
  };
  if (!slide.imageKey && !slide.imageUrl && fallback?.imageKey) slide.imageKey = fallback.imageKey;
  slide.href = hrefForSlide(slide);
  return slide;
}

/** Incoming order wins; any existing slide missing from incoming is kept at the end, hidden — never deleted. */
export function mergeHeroSlides(existing: HomeHeroSlide[], incoming: HomeHeroSlide[]): HomeHeroSlide[] {
  const seen = new Set(incoming.map((s) => s.id));
  const kept = existing
    .filter((s) => !seen.has(s.id))
    .map((s) => ({ ...s, hidden: true }));
  return [...incoming, ...kept];
}

export function listOrDefaults(stored: HomeHeroSlide[] | undefined | null): HomeHeroSlide[] {
  return stored?.length ? stored : defaultHomeHeroSlides.map((s) => ({ ...s }));
}
