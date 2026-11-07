import { VEHICLE_OPTIONAL_CATEGORIES } from "@/lib/search-language";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  visibleCategories,
  loadFacets,
  type CatalogFacets,
  type ProductFilter,
} from "@/lib/catalog";
import { writeSavedVehicle } from "@/lib/order-form";

export function Finder({
  state = {},
  compact = false,
}: {
  state?: ProductFilter;
  /** Home Light Clean card layout */
  compact?: boolean;
}) {
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

  const vehicleOptional = VEHICLE_OPTIONAL_CATEGORIES.includes(draft.category || "");
  const makes = facets?.makes ?? (draft.make ? [draft.make] : []);
  const models =
    draft.make && facets?.modelsByMake[draft.make]
      ? facets.modelsByMake[draft.make]
      : draft.model
        ? [draft.model]
        : [];
  const yearKey = `${draft.make || ""}\t${draft.model || ""}`;
  const years = facets?.yearsByMakeModel[yearKey] ?? (draft.year ? [Number(draft.year)] : []);

  function submit() {
    writeSavedVehicle({ make: draft.make, model: draft.model, year: draft.year });
    const fluids = vehicleOptional;
    navigate({
      to: "/results",
      search: {
        category: draft.category || undefined,
        make: fluids ? undefined : draft.make || undefined,
        model: fluids ? undefined : draft.model || undefined,
        year: fluids ? undefined : draft.year || undefined,
        type: undefined,
        q: undefined,
        fluidKind: undefined,
        oilBrand: undefined,
      },
    });
  }

  return (
    <div className={compact ? "w-full" : "w-full max-w-5xl"}>
      <form
        className={
          compact
            ? "rounded-2xl border border-line bg-card p-3 shadow-lift"
            : "grid grid-cols-1 gap-1.5 rounded-2xl border border-line bg-card p-2 shadow-lift sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]"
        }
        aria-label="חיפוש חלק לפי קטגוריה, יצרן, דגם ושנה"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className={compact ? "mb-2.5 grid grid-cols-2 gap-2" : "contents"}>
          <Field label="קטגוריה" compact={compact}>
            <select
              value={draft.category ?? ""}
              className={selectClass(compact)}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value || undefined }))}
            >
              <option value="">הכל</option>
              {visibleCategories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          {!vehicleOptional && (
            <>
              <Field label="יצרן" compact={compact}>
                <select
                  value={draft.make ?? ""}
                  className={selectClass(compact)}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      make: e.target.value || undefined,
                      model: undefined,
                      year: undefined,
                    }))
                  }
                >
                  <option value="">יצרן</option>
                  {makes.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="דגם" compact={compact}>
                <select
                  value={draft.model ?? ""}
                  className={selectClass(compact)}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, model: e.target.value || undefined, year: undefined }))
                  }
                >
                  <option value="">דגם</option>
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="שנה" compact={compact}>
                <select
                  value={draft.year ?? ""}
                  className={selectClass(compact)}
                  onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value || undefined }))}
                >
                  <option value="">שנה</option>
                  {years.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
        </div>
        <p className="px-2 pb-2 text-xs text-muted">
          {vehicleOptional ? "קטגוריה זו זמינה ללא בחירת רכב" : "בחירת רכב היא מסנן אופציונלי"}
        </p>
        <button
          type="submit"
          id="finder-submit"
          className={
            compact
              ? "w-full rounded-xl bg-accent px-4 py-3.5 text-[15px] font-extrabold text-on-accent shadow-[0_8px_20px_rgb(226_59_18_/_0.28)]"
              : "h-12 min-w-22 rounded-xl bg-accent px-5 text-sm font-extrabold text-on-accent lg:my-0.5 lg:h-auto"
          }
        >
          {compact ? "מצאו מוצרים" : "חפש"}
        </button>
      </form>
      {!compact ? (
        <div className="mt-3.5 flex w-full justify-between gap-3 text-[13px] text-muted">
          <span>לא בטוחים? חפשו לפי מק״ט למעלה, או שלחו תמונה בוואטסאפ.</span>
          <Link to="/help" className="shrink-0 text-accent underline underline-offset-4">
            לא מצאת? לחץ כאן
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function selectClass(compact?: boolean) {
  return compact
    ? "w-full rounded-[10px] border border-line bg-elevated px-2.5 py-2.5 text-sm text-fg outline-none"
    : "w-full border-0 bg-transparent text-[15px] font-semibold text-fg outline-none";
}

function Field({
  label,
  children,
  compact,
}: {
  label: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <label
      className={
        compact
          ? "flex flex-col text-right text-[10px] font-bold text-muted"
          : "flex flex-col px-3 py-1.5 text-right text-[11px] font-bold text-accent"
      }
    >
      {label}
      <span className={compact ? "mt-1" : undefined}>{children}</span>
    </label>
  );
}
