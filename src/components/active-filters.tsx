import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { categoryName, partTypes, type ListingSearch } from "@/lib/catalog";

export function ActiveFilters({ state }: { state: ListingSearch }) {
  const chips: { key: keyof ListingSearch; label: string }[] = [];
  if (state.q) chips.push({ key: "q", label: `חיפוש: ${state.q}` });
  if (state.category) chips.push({ key: "category", label: categoryName(state.category) || state.category });
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
          key={chip.key}
          to="/results"
          search={{ ...state, [chip.key]: undefined, page: undefined }}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-chip px-3 text-sm text-fg-soft hover:border-accent hover:text-fg"
        >
          {chip.label}
          <X className="size-3.5" aria-hidden />
          <span className="sr-only">הסר סינון</span>
        </Link>
      ))}
      <Link to="/results" className="text-sm text-accent-hot underline underline-offset-4">
        נקה הכל
      </Link>
    </div>
  );
}
