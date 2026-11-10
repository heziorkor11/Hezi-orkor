import { CategoryImage } from "@/components/category-image";
import { categoryImage } from "@/lib/category-images";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Phone, Search, ShoppingBag, X } from "lucide-react";
import { loadListing, visibleCategories, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useSiteMenu } from "@/lib/menu-store";
import { priceOrQuoteLabel } from "@/lib/prices";
import { ProductImage } from "@/components/product-image";

/** Two-stage sticky: logo/icons stay; search sticks then unsticks on deeper scroll. */
export function SiteHeader() {
  const navigate = useNavigate();
  const packsActive = useRouterState({
    select: (s) =>
      s.location.pathname === "/results" &&
      (s.location.search as { category?: string }).category === "workshop-packs",
  });
  const items = useCart((s) => s.items);
  const setMenuOpen = useSiteMenu((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  const [searchUnstuck, setSearchUnstuck] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const [openSuggest, setOpenSuggest] = useState(false);
  const boxRef = useRef<HTMLFormElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onScroll = () => setSearchUnstuck(window.scrollY > 140);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setBusy(true);
      loadListing({ q: trimmed })
        .then((listing) => {
          if (!cancelled) setHits(listing.items.slice(0, 6));
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpenSuggest(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const count = mounted ? items.reduce((s, x) => s + x.qty, 0) : 0;
  const showLive = openSuggest && q.trim().length >= 2;

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = q.trim();
    setOpenSuggest(false);
    navigate({ to: "/results", search: next ? { q: next } : {} });
  }

  return (
    <>
      <div className="bg-[#121212] px-3.5 py-1.5 text-center text-[11.5px] font-semibold text-white/85 md:px-5 md:text-xs">
        <span>המחירים כוללים מע״מ</span>
        <span aria-hidden className="mx-2 text-accent-hot">•</span>
        <span>בדיקת התאמה בוואטסאפ</span>
        <span aria-hidden className="mx-2 hidden text-accent-hot sm:inline">•</span>
        <a href={`tel:${brand.phoneTel}`} className="hidden hover:text-white sm:inline">
          {brand.phone}
        </a>
      </div>
      <header className="sticky top-0 z-50 border-b border-line bg-panel/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-3.5 py-2.5 md:px-5">
            <Link to="/" className="flex min-w-0 items-center gap-2">
              <img
                src="/brand/logo.jpg"
                alt="חזי אורקור"
                className="size-9 rounded-lg object-cover md:size-11"
                width={44}
                height={44}
              />
              <span className="truncate text-[15px] font-extrabold tracking-tight md:text-base">
                חזי אורקור
              </span>
            </Link>

            <nav aria-label="ראשי" className="flex items-center gap-2 text-sm text-fg-soft md:gap-3">
              <button
                type="button"
                className="sq-btn grid size-10 place-items-center border border-line md:hidden"
                aria-label="פתיחת תפריט קטגוריות"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="size-5" aria-hidden />
              </button>
              <a
                href={`https://wa.me/${brand.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="sq-btn bg-whatsapp px-3 py-2 text-xs font-extrabold text-[#062] md:px-3.5"
              >
                וואטסאפ
              </a>
              <a
                href={`tel:${brand.phoneTel}`}
                className="hidden items-center gap-1.5 hover:text-fg sm:flex"
              >
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
                  <span className="absolute -top-2 -left-2 grid min-w-4.5 place-items-center rounded-md bg-accent px-1 text-[11px] font-bold text-on-accent tabular-nums">
                    {count}
                  </span>
                ) : null}
              </Link>
            </nav>
          </div>
        </header>

        <div
          id="search"
          className={cn(
            "z-40 border-b border-line bg-panel/95 backdrop-blur-md",
            searchUnstuck ? "relative" : "sticky top-[53px] md:top-[61px]",
          )}
        >
          <form
            ref={boxRef}
            onSubmit={onSearch}
            className="relative mx-auto max-w-[1180px] px-3.5 py-2 md:px-5"
            role="search"
          >
            <label htmlFor="site-search" className="sr-only">
              חיפוש חלק, מק״ט או OE
            </label>
            <input
              id="site-search"
              name="q"
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpenSuggest(true);
              }}
              onFocus={() => setOpenSuggest(true)}
              placeholder="חפש פריט | חלק חילוף | מק״ט | OE"
              autoComplete="off"
              suppressHydrationWarning
              className="sq-btn h-11 w-full border border-line bg-elevated pr-4 pl-20 text-sm text-fg outline-none placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            {q ? (
              <button
                type="button"
                aria-label="ניקוי החיפוש"
                onClick={() => {
                  setQ("");
                  setHits([]);
                }}
                className="absolute top-1/2 left-14 grid size-8 -translate-y-1/2 place-items-center text-muted"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
            <button
              type="submit"
              aria-label="חיפוש"
              className="absolute top-1/2 left-5 grid size-9 -translate-y-1/2 place-items-center rounded-[10px] bg-accent text-on-accent hover:bg-accent-hot"
            >
              <Search className="size-4" />
            </button>
            {showLive ? (
              <div className="search-suggest absolute inset-x-3.5 top-[calc(100%-0.25rem)] z-50 overflow-hidden border border-line bg-card shadow-lift md:inset-x-5">
                <p className="px-3 pt-2.5 pb-1 text-[11px] font-bold text-muted">
                  {busy ? "מחפש…" : "תוצאות מהקטלוג"}
                </p>
                {hits.length ? (
                  <ul>
                    {hits.map((p) => (
                      <li key={p.id}>
                        <Link
                          to="/product/$id"
                          params={{ id: p.id }}
                          onClick={() => setOpenSuggest(false)}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-elevated"
                        >
                          <span className="home-cat-squircle menu-thumb shrink-0">
                            <ProductImage src={p.image} alt="" className="h-full w-full object-contain p-1" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 block text-sm font-bold">{p.name}</span>
                            <span className="block text-[11px] text-muted">{p.sku}</span>
                          </span>
                          <span className="shrink-0 text-xs font-extrabold text-accent-warm tabular-nums">
                            {priceOrQuoteLabel(p.sku)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : !busy ? (
                  <p className="px-3 py-3 text-sm text-muted">
                    לא נמצאו מוצרים תואמים.{" "}
                    <a
                      href={`https://wa.me/${brand.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-accent"
                    >
                      חפשו לי את החלק בוואטסאפ
                    </a>
                  </p>
                ) : null}
                <Link
                  to="/results"
                  search={q.trim() ? { q: q.trim() } : {}}
                  onClick={() => setOpenSuggest(false)}
                  className="block border-t border-line px-3 py-2.5 text-center text-sm font-bold text-accent"
                >
                  לכל התוצאות
                </Link>
              </div>
            ) : null}
          </form>
        </div>

      <div className="border-b border-line bg-panel px-3.5 py-2 md:px-5">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={packsActive}
            aria-label="מחירי מוסך / מארזים"
            data-packs-toggle
            data-active={packsActive}
            onClick={() =>
              navigate({
                to: "/results",
                search: packsActive ? {} : { category: "workshop-packs" },
              })
            }
            className={`sq-btn inline-flex min-h-11 items-center justify-center gap-2 border px-3 py-2 text-sm font-bold ${packsActive ? "border-accent bg-accent text-on-accent" : "border-line bg-card text-fg"}`}
          >
            <CategoryImage
              src={categoryImage("workshop-packs")}
              alt="מחירי מוסך / מארזים"
              className="size-9 rounded object-contain"
            />
            מחירי מוסך / מארזים
            <span aria-hidden="true" className="text-xs">
              {packsActive ? "פעיל · כיבוי" : "הצגה"}
            </span>
          </button>
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
            className="sq-btn shrink-0 border border-line px-3.5 py-1.5 text-[13px] text-fg-soft transition-colors duration-150 hover:border-transparent hover:bg-accent hover:text-on-accent"
          >
            {c.name}
          </Link>
        ))}
      </nav>
    </>
  );
}
