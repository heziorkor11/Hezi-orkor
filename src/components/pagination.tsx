import { Link } from "@tanstack/react-router";
import type { ListingSearch } from "@/lib/catalog";

const PAGE_SIZE = 9;

export { PAGE_SIZE };

export function Pagination({
  page,
  total,
  search,
}: {
  page: number;
  total: number;
  search: ListingSearch;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;

  const items = Array.from({ length: pages }, (_, i) => i + 1);

  return (
    <nav aria-label="עמודים" className="mt-6 flex flex-wrap items-center justify-center gap-2">
      {items.map((n) => {
        const active = n === page;
        return (
          <Link
            key={n}
            to="/results"
            search={{ ...search, page: n === 1 ? undefined : n }}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "grid size-11 place-items-center rounded-md bg-accent text-sm font-bold text-fg"
                : "grid size-11 place-items-center rounded-md border border-line-strong bg-elevated text-sm text-fg-soft hover:border-accent hover:text-fg"
            }
          >
            {n}
          </Link>
        );
      })}
    </nav>
  );
}
