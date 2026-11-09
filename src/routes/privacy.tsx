import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";
import { PrivacyBody } from "@/components/legal-bodies";
import { pageDescription, pageTitle } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: pageTitle("מדיניות פרטיות") },
      {
        name: "description",
        content: pageDescription("מדיניות פרטיות — מידע לפי דין הגנת הצרכן, פרטיות ונגישות."),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalDoc slug="privacy" title="מדיניות פרטיות" summary="מדיניות פרטיות.">
      <PrivacyBody />
    </LegalDoc>
  );
}
