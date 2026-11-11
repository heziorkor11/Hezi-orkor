import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { PartTypeChip } from "@/lib/part-types";
import { stateForPartType } from "@/lib/part-types";
import type { ListingSearch } from "@/lib/catalog-types";

/** iPhone-style rounded type chips. Counts come from the current vehicle/search filter. */
export function TypeChips({
  chips,
  state,
}: {
  chips: PartTypeChip[];
  state: ListingSearch;
}) {
  if (!chips.length) return null;
  const selected = chips.some((c) => c.active);
  const allSearch = stateForPartType(state, undefined);
  return (
    <nav aria-label="סוג החלק" className="mb-5">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          to="/results"
          search={allSearch}
          className={cn(
            "inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-[13px] font-bold whitespace-nowrap",
            !selected
              ? "border-accent bg-accent text-on-accent"
              : "border-line bg-chip text-fg-soft hover:border-accent hover:text-fg",
          )}
        >
          הכל
        </Link>
        {chips.map((chip) => (
          <Link
            key={chip.id}
            to="/results"
            search={chip.active ? allSearch : chip.search}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-[13px] font-bold whitespace-nowrap",
              chip.active
                ? "border-accent bg-accent text-on-accent"
                : "border-line bg-chip text-fg-soft hover:border-accent hover:text-fg",
            )}
          >
            {chip.label} ({chip.count})
          </Link>
        ))}
      </div>
    </nav>
  );
}
