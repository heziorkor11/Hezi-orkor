import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Phone, Search, ShoppingBag } from "lucide-react";
import { visibleCategories } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { brand } from "@/lib/brand";

export function SiteHeader() {
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = mounted ? items.reduce((s, x) => s + x.qty, 0) : 0;

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") || "").trim();
    navigate({ to: "/results", search: q ? { q } : {} });
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-panel/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 md:px-5">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img
              src="/brand/logo.jpg"
              alt="חזי אורקור"
              className="size-9 rounded-lg object-cover md:size-11"
            />
            <span className="truncate text-[15px] font-extrabold tracking-tight md:text-base">
              חזי אורקור
            </span>
          </Link>

          <form
            onSubmit={onSearch}
            className="relative order-3 hidden w-full max-w-xl flex-1 basis-full md:order-0 md:block md:basis-auto"
            role="search"
          >
            <label htmlFor="site-search" className="sr-only">
              חיפוש חלק, מק״ט או OE
            </label>
            <input
              id="site-search"
              name="q"
              type="search"
              placeholder="חפש פריט | חלק חילוף | מק״ט | OE"
              autoComplete="off"
              suppressHydrationWarning
              className="h-11 w-full rounded-xl border border-line bg-elevated pr-4 pl-12 text-sm text-fg outline-none placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="submit"
              aria-label="חיפוש"
              className="absolute top-1 left-1 grid size-9 place-items-center rounded-lg bg-accent text-on-accent hover:bg-accent-hot"
            >
              <Search className="size-4" />
            </button>
          </form>

          <nav aria-label="ראשי" className="flex items-center gap-2 text-sm text-fg-soft md:gap-3">
            <a
              href={`https://wa.me/${brand.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-whatsapp px-3 py-2 text-xs font-extrabold text-[#062] md:px-3.5"
            >
              וואטסאפ
            </a>
            <a href={`tel:${brand.phoneTel}`} className="hidden items-center gap-1.5 hover:text-fg sm:flex">
              <Phone className="size-4" />
              <span>{brand.phone}</span>
            </a>
            <Link to="/help" className="hidden hover:text-fg md:inline">
              לא מצאת?
            </Link>
            <Link
              to="/cart"
              className="relative flex items-center gap-1.5 hover:text-fg"
              aria-label={count > 0 ? `רשימת הצעת מחיר, ${count} פריטים` : "רשימת הצעת מחיר"}
            >
              <ShoppingBag className="size-4" />
              <span className="hidden sm:inline">הצעה</span>
              {count > 0 ? (
                <span className="absolute -top-2 -left-2 grid min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-on-accent tabular-nums">
                  {count}
                </span>
              ) : null}
            </Link>
          </nav>
        </div>
      </header>

      <div className="border-b border-line bg-panel px-3.5 py-2 md:px-5">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2">
          <Link to="/results" search={{ category: "workshop-packs" }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent px-4 py-2 text-sm font-extrabold text-accent hover:bg-accent hover:text-on-accent">
            <img src="/catalog/category-photos/workshop-packs.jpg" alt="" className="size-9 rounded object-contain" />
            מחירי מוסך / מארזים
          </Link>
          <span className="text-xs text-muted">המחירים כוללים מע״מ</span>
        </div>
      </div>
      <nav
        aria-label="קטגוריות חלקים"
        className="hidden flex-wrap gap-2 border-b border-line bg-panel px-4 py-2 md:flex md:px-5.5"
      >
        {visibleCategories.map((c) => (
          <Link
            key={c.id}
            to="/results"
            search={{ category: c.id }}
            className="shrink-0 rounded-full border border-line px-3.5 py-1.5 text-[13px] text-fg-soft transition-colors duration-150 hover:border-transparent hover:bg-accent hover:text-on-accent"
          >
            {c.name}
          </Link>
        ))}
      </nav>
    </>
  );
}
