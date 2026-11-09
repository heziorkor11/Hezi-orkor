import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";
import { AccessibilityBody } from "@/components/legal-bodies";
import { pageDescription, pageTitle } from "@/lib/seo";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: pageTitle("הצהרת נגישות") },
      {
        name: "description",
        content: pageDescription("הצהרת נגישות — מידע לפי דין הגנת הצרכן, פרטיות ונגישות."),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalDoc slug="accessibility" title="הצהרת נגישות" summary="הצהרת נגישות.">
      <AccessibilityBody />
    </LegalDoc>
  );
}
