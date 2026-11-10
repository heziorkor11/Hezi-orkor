import { categoryImage } from "@/lib/category-images";

/**
 * Home hero slides — swap image/title/cta here for design updates.
 * Prefer existing category assets or brand colors; do not hotlink third-party store media.
 */
export type HomeHeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  /** Internal path or /results search target */
  href: string;
  /** Optional photo; falls back to gradient-only when missing */
  image?: string;
  /** Tailwind-ish tone key for gradient overlay */
  tone: "ember" | "ink" | "warm";
};

export const homeHeroSlides: HomeHeroSlide[] = [
  {
    id: "brakes",
    title: "בלמים ואביזרים",
    subtitle: "צלחות, רפידות ונעלי בלם — התאמה לפי רכב או מק״ט",
    ctaLabel: "לקטלוג בלמים",
    href: "/results?category=brakes",
    image: categoryImage("brakes"),
    tone: "ember",
  },
  {
    id: "ac",
    title: "מדחסים ומעבים",
    subtitle: "מזגן לרכב — תמונות, מק״ט והתאמה לפני הזמנה",
    ctaLabel: "מדחס מזגן",
    href: "/results?category=ac-compressor",
    image: categoryImage("ac-compressor"),
    tone: "ink",
  },
  {
    id: "help",
    title: "לא מצאת חלק?",
    subtitle: "שלחו תמונה או מק״ט בוואטסאפ — נאתר ונשלח הצעת מחיר",
    ctaLabel: "דברו איתנו",
    href: "/help",
    image: categoryImage("filters"),
    tone: "warm",
  },
];
