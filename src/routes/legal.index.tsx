import { createFileRoute, Link } from "@tanstack/react-router";
import { legalMeta, legalNav } from "@/lib/legal";
import { pageDescription, pageTitle } from "@/lib/seo";

export const Route = createFileRoute("/legal/")({
  head: () => ({
    meta: [
      { title: pageTitle("תקנון ומסמכים") },
      {
        name: "description",
        content: pageDescription(
          "תנאי שימוש, מדיניות פרטיות, הצהרת נגישות, ביטול עסקה ומשלוח בחזי אורקור, נהריה.",
        ),
      },
    ],
  }),
  component: LegalIndex,
});

function LegalIndex() {
  return (
    <div className="mx-auto max-w-[760px] px-5 pt-10 pb-16">
      <p className="text-xs font-semibold tracking-wide text-accent-warm">עודכן {legalMeta.lastUpdated}</p>
      <h1 className="mt-2 mb-3 text-3xl tracking-tight">תקנון ומסמכים</h1>
      <p className="mb-8 leading-relaxed text-muted">
        כאן מרוכזים המסמכים שחלים על השימוש באתר, על הזמנה בוואטסאפ, על פרטיות ועל נגישות. אין בהם ויתור על
        זכויות שבחוק.
      </p>
      <ul className="grid gap-3">
        {legalNav.map((item) => (
          <li key={item.slug}>
            <Link
              to="/legal/$slug"
              params={{ slug: item.slug }}
              className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3.5 font-semibold text-fg hover:border-accent"
            >
              {item.title}
              <span aria-hidden className="text-accent-hot">
                ‹
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
