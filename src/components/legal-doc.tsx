import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { legalMeta, legalNav, type LegalSlug } from "@/lib/legal";

export function LegalDoc({
  slug,
  title,
  summary,
  children,
}: {
  slug: LegalSlug;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[760px] px-5 pt-10 pb-16">
      <nav aria-label="מסמכים משפטיים" className="mb-6 flex flex-wrap gap-2">
        {legalNav.map((item) => {
          const active = item.slug === slug;
          return (
            <Link
              key={item.slug}
              to="/legal/$slug"
              params={{ slug: item.slug }}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-fg"
                  : "rounded-full border border-line-strong px-3 py-1.5 text-xs font-semibold text-fg-soft hover:border-accent hover:text-fg"
              }
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
      <p className="text-xs font-semibold tracking-wide text-accent-warm">עודכן {legalMeta.lastUpdated}</p>
      <h1 className="mt-2 mb-3 text-3xl tracking-tight">{title}</h1>
      <p className="mb-8 leading-relaxed text-muted">{summary}</p>
      <div className="legal-prose space-y-6 text-[15px] leading-relaxed text-fg-soft">{children}</div>
      <p className="mt-10 border-t border-line pt-5 text-sm text-muted">
        אין במסמך זה ייעוץ משפטי, והוא אינו גורע מזכויות הקבועות בדין הישראלי — לרבות חוק הגנת הצרכן,
        חוק הגנת הפרטיות ותקנות הנגישות. סמכות השיפוט: {legalMeta.jurisdiction}, בכפוף לדין.
      </p>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-bold text-fg">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pr-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
