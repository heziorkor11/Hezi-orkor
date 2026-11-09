import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";
import { ReturnsBody } from "@/components/legal-bodies";
import { pageDescription, pageTitle } from "@/lib/seo";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: pageTitle("ביטול עסקה והחזרות") },
      {
        name: "description",
        content: pageDescription("ביטול עסקה והחזרות — מידע לפי דין הגנת הצרכן, פרטיות ונגישות."),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalDoc slug="returns" title="ביטול עסקה והחזרות" summary="זכות ביטול 14 יום במכר מרחוק, דמי ביטול לפי הדין, והחזר כספי תוך 14 יום.">
      <ReturnsBody />
    </LegalDoc>
  );
}
