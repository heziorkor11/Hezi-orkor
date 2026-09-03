import { Link } from "@tanstack/react-router";
import { PAGE_SIZE, type ListingSearch } from "@/lib/catalog";

export { PAGE_SIZE };

function pageItems(current: number, pages: number): Array<number | "ellipsis"> {
  if (pages <= 9) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set<number>([1, pages, current - 2, current - 1, current, current + 1, current + 2]);
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  for (const n of nums) {
    const prev = out[out.length - 1];
    if (typeof prev === "number" && n - prev > 1) out.push("ellipsis");
    out.push(n);
  }
  return out;
}

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
  const items = pageItems(page, pages);

  return (
    <nav aria-label="עמודים" className="mt-6 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link
          to="/results"
          search={{ ...search, page: page - 1 === 1 ? undefined : page - 1 }}
          className="grid h-11 min-w-11 place-items-center rounded-md border border-line-strong bg-elevated px-3 text-sm text-fg-soft hover:border-accent hover:text-fg"
        >
          הקודם
        </Link>
      ) : null}
      {items.map((n, i) =>
        n === "ellipsis" ? (
          <span key={`e${i}`} className="px-1 text-muted">
            …
          </span>
        ) : (
          <Link
            key={n}
            to="/results"
            search={{ ...search, page: n === 1 ? undefined : n }}
            aria-current={n === page ? "page" : undefined}
            className={
              n === page
                ? "grid size-11 place-items-center rounded-md bg-accent text-sm font-bold text-fg"
                : "grid size-11 place-items-center rounded-md border border-line-strong bg-elevated text-sm text-fg-soft hover:border-accent hover:text-fg"
            }
          >
            {n}
          </Link>
        ),
      )}
      {page < pages ? (
        <Link
          to="/results"
          search={{ ...search, page: page + 1 }}
          className="grid h-11 min-w-11 place-items-center rounded-md border border-line-strong bg-elevated px-3 text-sm text-fg-soft hover:border-accent hover:text-fg"
        >
          הבא
        </Link>
      ) : null}
    </nav>
  );
}
