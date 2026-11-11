import { Link } from "@tanstack/react-router";
import { LISTING_SORT_OPTIONS, parseListingSort } from "@/lib/listing-sort";
import type { ListingSearch } from "@/lib/catalog-types";
import { cn } from "@/lib/utils";

/** Sort chips for category / subcategory / search listings. Value lives in `?sort=`. */
export function ListingSortControl({ state }: { state: ListingSearch }) {
  const active = parseListingSort(state.sort);

  return (
    <div className="mb-4" data-listing-sort>
      <p className="mb-2 text-[11px] font-bold text-muted">מיון</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="מיון תוצאות">
        {LISTING_SORT_OPTIONS.map((opt) => {
          const selected = active === opt.id;
          return (
            <Link
              key={opt.id}
              to="/results"
              search={{
                ...state,
                sort: opt.urlValue as ListingSearch["sort"],
                page: undefined,
              }}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13px] font-bold",
                selected
                  ? "border-accent bg-accent text-on-accent"
                  : "border-line bg-elevated text-fg-soft hover:border-accent",
              )}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
