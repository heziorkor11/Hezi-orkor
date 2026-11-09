import { createFileRoute, notFound } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";
import {
  AccessibilityBody,
  PrivacyBody,
  ReturnsBody,
  ShippingBody,
  TermsBody,
} from "@/components/legal-bodies";
import { isLegalSlug, type LegalSlug } from "@/lib/legal";
import { pageDescription, pageTitle } from "@/lib/seo";

const titles: Record<LegalSlug, { title: string; summary: string }> = {
  terms: {
    title: "תנאי שימוש",
    summary: "השימוש באתר ובשירות ההזמנה בוואטסאפ כפוף לתנאים אלה ולדין הישראלי.",
  },
  privacy: {
    title: "מדיניות פרטיות",
    summary:
      "מדיניות זו מתארת איזה מידע נאסף באתר, למה, למי הוא מועבר, ומה הזכויות שלכם לפי חוק הגנת הפרטיות.",
  },
  accessibility: {
    title: "הצהרת נגישות",
    summary: "הצהרה לפי תקנות שוויון זכויות לאנשים עם מוגבלות ות״י 5568.",
  },
  cancellation: {
    title: "ביטול עסקה והחזרות",
    summary: "זכות הביטול לפי חוק הגנת הצרכן בעסקת מכר מרחוק, ואופן המימוש.",
  },
  shipping: {
    title: "משלוח, איסוף ואחריות",
    summary: "איסוף, משלוח, אחריות לחלק חדש, ואישור התאמה לרכב לפני התקנה.",
  },
};

export const Route = createFileRoute("/legal/$slug")({
  beforeLoad: ({ params }) => {
    if (!isLegalSlug(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const slug = params.slug;
    const doc = isLegalSlug(slug) ? titles[slug] : null;
    return {
      meta: [
        { title: pageTitle(doc?.title || "מסמך") },
        { name: "description", content: pageDescription(doc?.summary || "") },
      ],
    };
  },
  component: LegalSlugPage,
});

function LegalSlugPage() {
  const { slug } = Route.useParams();
  if (!isLegalSlug(slug)) return null;
  const doc = titles[slug];
  return (
    <LegalDoc slug={slug} title={doc.title} summary={doc.summary}>
      {slug === "terms" ? <TermsBody /> : null}
      {slug === "privacy" ? <PrivacyBody /> : null}
      {slug === "accessibility" ? <AccessibilityBody /> : null}
      {slug === "cancellation" ? <ReturnsBody /> : null}
      {slug === "shipping" ? <ShippingBody /> : null}
    </LegalDoc>
  );
}
