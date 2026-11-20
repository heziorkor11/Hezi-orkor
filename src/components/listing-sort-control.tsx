import { Link } from "@tanstack/react-router";
import { LISTING_SORT_OPTIONS, parseListingSort } from "@/lib/listing-sort";
import type { ListingSearch } from "@/lib/catalog-types";
import { cn } from "@/lib/utils";

/** Sort chips for category / subcategory / search listings. Value lives in `?sort=`. */
export function ListingSortControl({
  state,
  compact = false,
}: {
  state: ListingSearch;
  /** One scrollable row with the label inline (vehicle results page). */
  compact?: boolean;
}) {
  const active = parseListingSort(state.sort);

  return (
    <div
      className={cn("mb-4", compact && "flex items-center gap-2 overflow-x-auto whitespace-nowrap")}
      data-listing-sort
    >
      <p className={cn("text-[11px] font-bold text-muted", compact ? "shrink-0" : "mb-2")}>
        {compact ? "מיון:" : "מיון"}
      </p>
      <div
        className={cn("flex gap-2", compact ? "shrink-0" : "flex-wrap")}
        role="group"
        aria-label="מיון תוצאות"
      >
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
