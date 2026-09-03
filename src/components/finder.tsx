import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { categories, loadFacets, type CatalogFacets, type ProductFilter } from "@/lib/catalog";
import { Button } from "@/components/ui/button";

export function Finder({ state = {} }: { state?: ProductFilter }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProductFilter>(state);
  const [facets, setFacets] = useState<CatalogFacets | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadFacets().then((next) => {
      if (!cancelled) setFacets(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const makes = facets?.makes ?? (draft.make ? [draft.make] : []);
  const models = draft.make && facets?.modelsByMake[draft.make]
    ? facets.modelsByMake[draft.make]
    : draft.model
      ? [draft.model]
      : [];
  const yearKey = `${draft.make || ""}\t${draft.model || ""}`;
  const years = facets?.yearsByMakeModel[yearKey] ?? (draft.year ? [Number(draft.year)] : []);

  function submit() {
    navigate({
      to: "/results",
      search: {
        category: draft.category || undefined,
        make: draft.make || undefined,
        model: draft.model || undefined,
        year: draft.year || undefined,
        type: undefined,
        q: undefined,
      },
    });
  }

  return (
    <div className="w-full max-w-5xl">
      <form
        className="grid grid-cols-1 gap-1.5 rounded-xl border border-line-strong bg-card/95 p-2 shadow-lift sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:rounded-full"
        aria-label="חיפוש חלק לפי קטגוריה, יצרן, דגם ושנה"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="1 · קטגוריה">
          <select
            value={draft.category ?? ""}
            className="w-full border-0 bg-transparent text-[15px] font-semibold text-fg outline-none"
            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value || undefined }))}
          >
            <option value="">כל הקטגוריות</option>
            {categories.map((t) => (
              <option key={t.id} value={t.id} className="text-ink">
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="2 · יצרן רכב">
          <select
            value={draft.make ?? ""}
            className="w-full border-0 bg-transparent text-[15px] font-semibold text-fg outline-none"
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                make: e.target.value || undefined,
                model: undefined,
                year: undefined,
              }))
            }
          >
            <option value="">בחר יצרן</option>
            {makes.map((m) => (
              <option key={m} value={m} className="text-ink">
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="3 · דגם">
          <select
            value={draft.model ?? ""}
            className="w-full border-0 bg-transparent text-[15px] font-semibold text-fg outline-none"
            onChange={(e) =>
              setDraft((d) => ({ ...d, model: e.target.value || undefined, year: undefined }))
            }
          >
            <option value="">בחר דגם</option>
            {models.map((m) => (
              <option key={m} value={m} className="text-ink">
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="4 · שנה">
          <select
            value={draft.year ?? ""}
            className="w-full border-0 bg-transparent text-[15px] font-semibold text-fg outline-none"
            onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value || undefined }))}
          >
            <option value="">בחר שנה</option>
            {years.map((y) => (
              <option key={y} value={String(y)} className="text-ink">
                {y}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" variant="accent" className="h-12 min-w-22 rounded-full lg:my-0.5 lg:h-auto" id="finder-submit">
          חפש
        </Button>
      </form>
      <div className="mt-3.5 flex w-full justify-between gap-3 text-[13px] text-muted">
        <span>לא בטוחים? חפשו לפי מק״ט למעלה, או שלחו תמונה בוואטסאפ.</span>
        <Link to="/help" className="shrink-0 text-accent-hot underline underline-offset-4">
          לא מצאת? לחץ כאן
        </Link>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col px-3 py-1.5 text-right text-[11px] font-bold text-accent-hot">
      {label}
      {children}
    </label>
  );
}
