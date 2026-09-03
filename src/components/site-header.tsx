import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Phone, Search, ShoppingBag } from "lucide-react";
import { categories } from "@/lib/catalog";
import { useCart } from "@/lib/cart";

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
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ink/94 px-4 py-1.5 backdrop-blur-md md:px-5.5">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/brand/logo.jpg"
            alt="חזי אורקור"
            className="h-14 w-auto object-contain drop-shadow-[0_0_12px_rgb(226_59_18_/_0.4)]"
          />
          <span className="hidden flex-col leading-none sm:flex">
            <strong className="text-base tracking-wide">חזי אורקור</strong>
            <small className="text-[10px] font-bold tracking-wide text-accent-hot">
              חלפים לרכב בנהריה
            </small>
          </span>
        </Link>

        <form onSubmit={onSearch} className="relative order-3 w-full max-w-xl flex-1 basis-full md:order-0 md:basis-auto" role="search">
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
            className="h-11 w-full rounded-full border border-line-strong bg-elevated pr-4 pl-12 text-sm text-fg outline-none placeholder:text-subtle focus:border-accent-hot focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            aria-label="חיפוש"
            className="absolute top-1 left-1 grid size-9 place-items-center rounded-full bg-accent text-fg hover:bg-accent-hot"
          >
            <Search className="size-4" />
          </button>
        </form>

        <nav aria-label="ראשי" className="flex items-center gap-3 text-sm text-fg-soft">
          <a href="tel:0524858516" className="flex items-center gap-1.5 hover:text-fg">
            <Phone className="size-4" />
            <span className="hidden sm:inline">052-485-8516</span>
            <span className="sr-only sm:hidden">052-485-8516</span>
          </a>
          <Link to="/about" className="hidden hover:text-fg md:inline">
            אודות
          </Link>
          <Link to="/help" className="hover:text-fg">
            לא מצאת?
          </Link>
          <Link to="/legal/$slug" params={{ slug: "accessibility" }} className="hidden hover:text-fg md:inline">
            נגישות
          </Link>
          <Link to="/cart" className="relative flex items-center gap-1.5 hover:text-fg" aria-label={count > 0 ? `רשימת הצעת מחיר, ${count} פריטים` : "רשימת הצעת מחיר"}>
            <ShoppingBag className="size-4" />
            הצעה
            {count > 0 ? (
              <span className="absolute -top-2 -left-2 grid min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-fg tabular-nums">
                {count}
              </span>
            ) : null}
          </Link>
        </nav>
      </header>

      <nav aria-label="קטגוריות חלקים" className="flex flex-wrap gap-2 border-b border-line bg-ink px-4 py-2 md:px-5.5">
        {categories.map((c) => (
          <Link
            key={c.id}
            to="/results"
            search={{ category: c.id }}
            className="shrink-0 rounded-full border border-line-strong px-3.5 py-1.5 text-[13px] text-fg-soft transition-colors duration-150 hover:border-transparent hover:bg-accent hover:text-fg"
          >
            {c.name}
          </Link>
        ))}
      </nav>
    </>
  );
}
