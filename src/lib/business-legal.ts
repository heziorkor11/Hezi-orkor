/**
 * Legal-facing business identity only. Fill these before publishing legal pages.
 * Do not invent values — leave bracket placeholders until Matan confirms.
 * Operational WhatsApp/phone for ordering still uses `brand` separately.
 */
export const businessLegal = {
  companyName: "[שם העסק / החברה]",
  companyId: "[ח״פ / עוסק מורשה]",
  address: "[כתובת פיזית]",
  city: "[עיר]",
  phone: "[טלפון]",
  email: "[אימייל]",
  accessibilityCoordinator: "[שם רכז/ת נגישות]",
  hours: "[שעות פעילות]",
  jurisdiction: "בתי המשפט המוסמכים במחוז חיפה",
  accessibilityStandard: "ת״י 5568 (WCAG 2.0 רמת AA)",
  lastUpdated: "9 בנובמבר 2026",
  lastUpdatedIso: "2026-11-09",
  /** Final-quote wording aligned with the open product-notice PR (sentence 2). */
  finalQuoteNote:
    "המחירים באתר עשויים להשתנות. המחיר הסופי ייקבע בהצעת מחיר שנשלח אליך לאחר אימות פרטי המשלוח.",
  vatNote: "המחירים המוצגים באתר כוללים מע״מ, אלא אם נכתב במפורש אחרת.",
} as const;

export const legalPublicPaths = {
  terms: "/terms",
  privacy: "/privacy",
  accessibility: "/accessibility",
  returns: "/returns",
  cancel: "/cancel",
  shipping: "/legal/shipping",
  hub: "/legal",
} as const;
