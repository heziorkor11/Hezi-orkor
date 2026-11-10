import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal, X } from "lucide-react";
import { Finder } from "@/components/finder";
import { FluidsFilters } from "@/components/fluids-filters";
import { loadListing, type ListingSearch } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function FilterSheet({ state, total }: { state: ListingSearch; total: number }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(total);
  const navigate = useNavigate();

  useEffect(() => {
    setCount(total);
  }, [total]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadListing({ ...state, page: undefined }).then((listing) => {
      if (!cancelled) setCount(listing.total);
    });
    return () => {
      cancelled = true;
    };
  }, [open, state]);

  const isFluids = state.category === "fluids" || Boolean(state.fluidKind) || Boolean(state.oilBrand);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="filter-fab sq-btn md:hidden"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        סינון
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label="סינון מוצרים">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="סגירת הסינון"
            onClick={() => setOpen(false)}
          />
          <div className="filter-sheet absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col bg-panel">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-base font-extrabold">סינון מוצרים</h2>
              <button
                type="button"
                aria-label="סגירה"
                onClick={() => setOpen(false)}
                className="sq-btn grid size-10 place-items-center border border-line"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
              {isFluids ? <FluidsFilters state={state} /> : <Finder state={state} compact />}
            </div>
            <div className="flex gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                className="sq-btn flex-1 border border-line py-3 text-sm font-bold"
                onClick={() => {
                  setOpen(false);
                  navigate({ to: "/results", search: state.category ? { category: state.category } : {} });
                }}
              >
                נקה הכל
              </button>
              <button
                type="button"
                className={cn("sq-btn flex-[2] bg-accent py-3 text-sm font-extrabold text-on-accent")}
                onClick={() => setOpen(false)}
              >
                הצג {count} מוצרים
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
