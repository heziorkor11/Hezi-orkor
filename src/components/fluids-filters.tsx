import { subcategories } from "@/lib/display-taxonomy";
import { Link } from "@tanstack/react-router";
import {
  FLUID_KIND_LABELS,
  OIL_BRAND_OPTIONS,
  type FluidKind,
  type OilBrand,
} from "@/lib/fluid-classify";
import type { ListingSearch } from "@/lib/catalog-types";
import { cn } from "@/lib/utils";

const KINDS: FluidKind[] = ["engine", "gear"];

export function FluidsFilters({ state }: { state: ListingSearch }) {
  const activeKind = ((state.sub || state.fluidKind) as FluidKind | undefined) || undefined;
  const activeBrand = (state.oilBrand as OilBrand | undefined) || undefined;

  function linkFor(next: Partial<ListingSearch>) {
    return {
      to: "/results" as const,
      search: {
        category: "fluids",
        sub: next.fluidKind === "engine" || next.fluidKind === "gear" ? next.fluidKind : undefined,
        fluidKind: next.fluidKind === "brake" ? "brake" : undefined,
        oilBrand: next.oilBrand,
        q: state.q,
        // Vehicle fitment is not used for fluids browse
        make: undefined,
        model: undefined,
        year: undefined,
        type: undefined,
        page: undefined,
      },
    };
  }

  return (
    <div className="mb-5 space-y-4 rounded-2xl border border-line bg-card p-3.5 shadow-lift md:p-4">
      <div>
        <p className="mb-2 text-[11px] font-bold text-muted">סוג</p>
        <div className="flex flex-wrap gap-2">
          <Link
            {...linkFor({ fluidKind: undefined, oilBrand: activeBrand })}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] font-bold",
              !activeKind
                ? "border-accent bg-accent text-on-accent"
                : "border-line bg-elevated text-fg-soft hover:border-accent",
            )}
          >
            הכל
          </Link>
          {KINDS.map((k) => (
            <Link
              key={k}
              {...linkFor({
                fluidKind: k,
                oilBrand: activeBrand,
              })}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13px] font-bold",
                activeKind === k
                  ? "border-accent bg-accent text-on-accent"
                  : "border-line bg-elevated text-fg-soft hover:border-accent",
              )}
            >
              {FLUID_KIND_LABELS[k]} ({subcategories.fluids?.find(s => s.id === k)?.count || 0})
            </Link>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-bold text-muted">מותג</p>
        <div className="flex flex-wrap gap-2">
          <Link
            {...linkFor({ fluidKind: activeKind, oilBrand: undefined })}
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
              {...linkFor({ fluidKind: activeKind, oilBrand: b })}
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
