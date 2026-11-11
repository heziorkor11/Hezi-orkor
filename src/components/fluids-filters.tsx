import { Link } from "@tanstack/react-router";
import { OIL_BRAND_OPTIONS, type OilBrand } from "@/lib/fluid-classify";
import type { ListingSearch } from "@/lib/catalog-types";
import { cn } from "@/lib/utils";

export function FluidsFilters({ state }: { state: ListingSearch }) {
  const activeBrand = (state.oilBrand as OilBrand | undefined) || undefined;

  function linkFor(next: Partial<ListingSearch>) {
    return {
      to: "/results" as const,
      search: {
        category: "fluids",
        sub: state.sub,
        fluidKind: state.fluidKind,
        oilBrand: next.oilBrand,
        q: state.q,
        sort: state.sort,
        type: state.type,
        page: undefined,
      },
    };
  }

  return (
    <div className="mb-5 space-y-4 rounded-2xl border border-line bg-card p-3.5 shadow-lift md:p-4">
      <p className="text-xs text-muted">שמנים ונוזלים — ללא צורך בבחירת רכב</p>
      <div>
        <p className="mb-2 text-[11px] font-bold text-muted">מותג</p>
        <div className="flex flex-wrap gap-2">
          <Link
            {...linkFor({ oilBrand: undefined })}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] font-bold",
              !activeBrand
                ? "border-fg bg-fg text-on-accent"
                : "border-line bg-elevated text-fg-soft hover:border-fg",
            )}
          >
            כל המותגים
          </Link>
          {OIL_BRAND_OPTIONS.map((b) => (
            <Link
              key={b}
              {...linkFor({ oilBrand: b })}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13px] font-bold",
                activeBrand === b
                  ? "border-fg bg-fg text-on-accent"
                  : "border-line bg-elevated text-fg-soft hover:border-fg",
              )}
            >
              {b}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
