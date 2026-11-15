import { categoryImage } from "@/lib/category-images";
import { brand } from "@/lib/brand";
import heroOverrides from "../../public/catalog/home-hero-overrides.json" with { type: "json" };
import { overlayHomeHero } from "@/lib/admin/public-overlay";

export type HeroLinkType = "category" | "product" | "search" | "whatsapp" | "help";
export type HeroTimerPosition = "top" | "button" | "bottom";
export type HeroTone = "ember" | "ink" | "warm";

export type HomeHeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  /** Internal path, search URL, or WhatsApp link. Derived from linkType when set. */
  href?: string;
  /** Resolved URL for rendering (category asset or uploaded image). */
  image?: string;
  /** Category photo key, e.g. "brakes". Preferred over a built hashed URL in the overlay. */
  imageKey?: string;
  /** Uploaded image public URL, e.g. /api/hero-image/brakes */
  imageUrl?: string;
  /** Repo-relative path of an uploaded file, used to serve the image. */
  imagePath?: string;
  tone: HeroTone;
  hidden?: boolean;
  /** Inclusive calendar day YYYY-MM-DD in Asia/Jerusalem. */
  startDate?: string;
  endDate?: string;
  timerEnabled?: boolean;
  timerPosition?: HeroTimerPosition;
  linkType?: HeroLinkType;
  /** Category id, product SKU, or search query. Unused for whatsapp/help. */
  linkTarget?: string;
};

export const defaultHomeHeroSlides: HomeHeroSlide[] = [
  {
    id: "brakes",
    title: "בלמים ואביזרים",
    subtitle: "צלחות, רפידות ונעלי בלם — התאמה לפי רכב או מק״ט",
    ctaLabel: "לקטלוג בלמים",
    href: "/results?category=brakes",
    imageKey: "brakes",
    tone: "ember",
    linkType: "category",
    linkTarget: "brakes",
  },
  {
    id: "ac",
    title: "מדחסים ומעבים",
    subtitle: "מזגן לרכב — תמונות, מק״ט והתאמה לפני הזמנה",
    ctaLabel: "מדחס מזגן",
    href: "/results?category=ac-compressor",
    imageKey: "ac-compressor",
    tone: "ink",
    linkType: "category",
    linkTarget: "ac-compressor",
  },
  {
    id: "help",
    title: "לא מצאת חלק?",
    subtitle: "שלחו תמונה או מק״ט בוואטסאפ — נאתר ונשלח הצעת מחיר",
    ctaLabel: "דברו איתנו",
    href: "/help",
    imageKey: "filters",
    tone: "warm",
    linkType: "help",
  },
];

/** Used when every managed slide is hidden or outside its schedule, so the hero is never empty. */
export const fallbackHelpSlide: HomeHeroSlide = {
  ...defaultHomeHeroSlides[2]!,
  id: "help-fallback",
  hidden: false,
  timerEnabled: false,
  startDate: undefined,
  endDate: undefined,
};

const fileSlides = (heroOverrides as { slides?: HomeHeroSlide[] }).slides;

export const homeHeroSlides: HomeHeroSlide[] = defaultHomeHeroSlides;

export function hrefForSlide(slide: HomeHeroSlide): string {
  switch (slide.linkType) {
    case "category":
      return slide.linkTarget ? `/results?category=${encodeURIComponent(slide.linkTarget)}` : "/results";
    case "product":
      return slide.linkTarget ? `/product/${encodeURIComponent(slide.linkTarget)}` : "/";
    case "search":
      return slide.linkTarget ? `/results?q=${encodeURIComponent(slide.linkTarget)}` : "/results";
    case "whatsapp":
      return `https://wa.me/${brand.whatsapp}`;
    case "help":
      return "/help";
    default:
      return slide.href || "/";
  }
}

export function resolveSlideImage(slide: HomeHeroSlide): string | undefined {
  if (slide.imageUrl?.trim()) return slide.imageUrl.trim();
  if (slide.imageKey) return categoryImage(slide.imageKey);
  if (slide.image?.trim()) return slide.image.trim();
  return undefined;
}

export function withResolvedSlide(slide: HomeHeroSlide): HomeHeroSlide {
  return {
    ...slide,
    href: hrefForSlide(slide),
    image: resolveSlideImage(slide),
  };
}

export function bundledHeroSlides(): HomeHeroSlide[] {
  return fileSlides?.length ? fileSlides : defaultHomeHeroSlides;
}

/** Live overlay wins when it has slides; otherwise the bundled file or the hardcoded defaults. */
export function currentHomeHeroSlides(): HomeHeroSlide[] {
  return overlayHomeHero(bundledHeroSlides()).map(withResolvedSlide);
}
