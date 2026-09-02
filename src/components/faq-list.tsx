import { JsonLd } from "@/components/json-ld";
import { faqJsonLd } from "@/lib/seo";

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section className="mt-10">
      <JsonLd data={faqJsonLd(items)} />
      <h2 className="mb-1 text-2xl tracking-tight">שאלות שעולות לפני הזמנה</h2>
      <p className="mb-4 text-muted">תשובות קצרות. אם חסר משהו — וואטסאפ.</p>
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
        {items.map((item) => (
          <details key={item.q} className="group px-4 py-3">
            <summary className="cursor-pointer list-none font-semibold marker:content-none">
              <span className="flex items-center justify-between gap-3">
                {item.q}
                <span className="grid size-7 shrink-0 place-items-center rounded-md border border-line-strong text-muted transition-transform duration-150 group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-2 max-w-prose leading-relaxed text-fg-soft">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
