import { brand } from "@/lib/catalog";

export const legalMeta = {
  lastUpdated: "2 בספטמבר 2026",
  lastUpdatedIso: "2026-09-02",
  coordinatorName: brand.nameHe,
  jurisdiction: "בתי המשפט המוסמכים במחוז חיפה",
  standard: "ת״י 5568 (WCAG 2.0 רמת AA)",
} as const;

export const legalSlugs = ["terms", "privacy", "accessibility", "cancellation", "shipping"] as const;
export type LegalSlug = (typeof legalSlugs)[number];

export function isLegalSlug(value: string): value is LegalSlug {
  return (legalSlugs as readonly string[]).includes(value);
}

export const legalNav: { slug: LegalSlug; title: string }[] = [
  { slug: "terms", title: "תנאי שימוש" },
  { slug: "privacy", title: "מדיניות פרטיות" },
  { slug: "accessibility", title: "הצהרת נגישות" },
  { slug: "cancellation", title: "ביטול עסקה" },
  { slug: "shipping", title: "משלוח ואחריות" },
];
