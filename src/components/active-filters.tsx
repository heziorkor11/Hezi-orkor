import { subcategories } from "@/lib/display-taxonomy";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { categoryName, partTypes, type ListingSearch } from "@/lib/catalog";
import { FLUID_KIND_LABELS, type FluidKind } from "@/lib/fluid-classify";
import { isPartTypeChip, partTypeLabel } from "@/lib/part-types";

export function ActiveFilters({ state }: { state: ListingSearch }) {
  const chips: { key: keyof ListingSearch; label: string; clear?: Partial<ListingSearch> }[] = [];
  if (state.q) chips.push({ key: "q", label: `חיפוש: ${state.q}` });
  if (state.category) {
    chips.push({
      key: "category",
      label: categoryName(state.category) || state.category,
      clear: { category: undefined, sub: undefined, type: undefined, fluidKind: undefined },
    });
  }
  if (state.sub && state.sub !== state.type) {
    chips.push({
      key: "sub",
      label: subcategories[state.category || ""]?.find((s) => s.id === state.sub)?.name || state.sub,
      clear: { sub: undefined, ...(state.type === state.sub ? { type: undefined } : {}) },
    });
  }
  if (state.fluidKind && state.fluidKind !== state.type && state.fluidKind !== state.sub) {
    chips.push({
      key: "fluidKind",
      label: FLUID_KIND_LABELS[state.fluidKind as FluidKind] || state.fluidKind,
    });
  }
  if (state.oilBrand) chips.push({ key: "oilBrand", label: `מותג: ${state.oilBrand}` });
  if (state.viscosity) chips.push({ key: "viscosity", label: state.viscosity });
  if (state.axle) chips.push({ key: "axle", label: state.axle === "front" ? "קדמי" : state.axle === "rear" ? "אחורי" : state.axle });
  if (state.hand) chips.push({ key: "hand", label: state.hand === "left" ? "שמאל" : state.hand === "right" ? "ימין" : state.hand });
  if (state.type) {
    const name = isPartTypeChip(state.type)
      ? partTypeLabel(state.category, state.type) || state.type
      : partTypes.find((t) => t.id === state.type)?.name || state.type;
    chips.push({
      key: "type",
      label: name,
      clear: {
        type: undefined,
        ...(state.sub === state.type ? { sub: undefined } : {}),
        ...(state.fluidKind === state.type ? { fluidKind: undefined } : {}),
      },
    });
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
          search={{ ...state, [chip.key]: undefined, ...chip.clear, page: undefined }}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-chip px-3 text-sm text-fg-soft hover:border-accent hover:text-fg"
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
