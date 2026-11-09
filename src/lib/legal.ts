import { businessLegal, legalPublicPaths } from "@/lib/business-legal";

export const legalMeta = {
  lastUpdated: businessLegal.lastUpdated,
  lastUpdatedIso: businessLegal.lastUpdatedIso,
  coordinatorName: businessLegal.accessibilityCoordinator,
  jurisdiction: businessLegal.jurisdiction,
  standard: businessLegal.accessibilityStandard,
} as const;

export const legalSlugs = ["terms", "privacy", "accessibility", "cancellation", "shipping"] as const;
export type LegalSlug = (typeof legalSlugs)[number];

export function isLegalSlug(value: string): value is LegalSlug {
  return (legalSlugs as readonly string[]).includes(value);
}

/** Primary public URLs (short paths preferred; shipping stays under /legal). */
export const legalNav: { slug: LegalSlug; title: string; href: string }[] = [
  { slug: "terms", title: "תנאי שימוש", href: legalPublicPaths.terms },
  { slug: "privacy", title: "מדיניות פרטיות", href: legalPublicPaths.privacy },
  { slug: "accessibility", title: "הצהרת נגישות", href: legalPublicPaths.accessibility },
  { slug: "cancellation", title: "ביטול והחזרות", href: legalPublicPaths.returns },
  { slug: "shipping", title: "משלוח ואחריות", href: legalPublicPaths.shipping },
];
