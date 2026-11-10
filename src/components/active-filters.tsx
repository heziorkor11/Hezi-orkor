import { subcategories } from "@/lib/display-taxonomy";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { categoryName, partTypes, type ListingSearch } from "@/lib/catalog";
import { FLUID_KIND_LABELS, type FluidKind } from "@/lib/fluid-classify";

export function ActiveFilters({ state }: { state: ListingSearch }) {
  const chips: { key: keyof ListingSearch; label: string }[] = [];
  if (state.q) chips.push({ key: "q", label: `חיפוש: ${state.q}` });
  if (state.category) chips.push({ key: "category", label: categoryName(state.category) || state.category });
  if (state.sub) chips.push({key: "sub", label: subcategories[state.category || ""]?.find(s => s.id === state.sub)?.name || state.sub});
  if (state.fluidKind) {
    chips.push({
      key: "fluidKind",
      label: FLUID_KIND_LABELS[state.fluidKind as FluidKind] || state.fluidKind,
    });
  }
  if (state.oilBrand) chips.push({ key: "oilBrand", label: `מותג: ${state.oilBrand}` });
  if (state.type) {
    const name = partTypes.find((t) => t.id === state.type)?.name || state.type;
    chips.push({ key: "type", label: name });
  }
  if (state.make) chips.push({ key: "make", label: state.make });
  if (state.model) chips.push({ key: "model", label: state.model });
  if (state.year) chips.push({ key: "year", label: state.year });

  if (!chips.length) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Link
          key={String(chip.key)}
          to="/results"
          search={{ ...state, [chip.key]: undefined, ...(chip.key === "category" ? {sub: undefined} : {}), page: undefined }}
          className="sq-btn inline-flex h-9 items-center gap-1.5 border border-line-strong bg-chip px-3 text-sm text-fg-soft hover:border-accent hover:text-fg"
        >
          {chip.label}
          <X className="size-3.5" aria-hidden />
          <span className="sr-only">הסר סינון</span>
        </Link>
      ))}
      <Link to="/results" className="text-sm text-accent underline underline-offset-4">
        נקה הכל
      </Link>
    </div>
  );
}
