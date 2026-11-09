import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";
import { TermsBody } from "@/components/legal-bodies";
import { pageDescription, pageTitle } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: pageTitle("תנאי שימוש") },
      {
        name: "description",
        content: pageDescription("תנאי שימוש — מידע לפי דין הגנת הצרכן, פרטיות ונגישות."),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalDoc slug="terms" title="תנאי שימוש" summary="תנאי שימוש.">
      <TermsBody />
    </LegalDoc>
  );
}
