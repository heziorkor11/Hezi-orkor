import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HomeCarouselCard } from "@/components/home-carousel-card";
import type { Product } from "@/lib/catalog-types";
import { Link } from "@tanstack/react-router";

export function HomeProductCarousel({
  title,
  subtitle,
  moreLabel,
  moreSearch,
  products,
  badge,
}: {
  title: string;
  subtitle?: string;
  moreLabel?: string;
  moreSearch?: { category?: string };
  products: Product[];
  badge?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  function scrollByDir(dir: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    const amount = Math.max(220, el.clientWidth * 0.85) * dir;
    el.scrollBy({ left: -amount, behavior: "smooth" });
  }

  if (!products.length) return null;

  return (
    <section className="px-3.5 pt-8 md:px-5">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-extrabold tracking-tight md:text-2xl">{title}</h2>
            {subtitle ? (
              <>
                <span className="mt-1 block h-0.5 w-10 rounded-full bg-accent" aria-hidden />
                <p className="mt-1.5 text-xs text-muted md:text-sm">{subtitle}</p>
              </>
            ) : null}
          </div>
          {moreLabel ? (
            <Link
              to="/results"
              search={moreSearch || {}}
              className="shrink-0 text-xs font-bold text-accent hover:underline md:text-sm"
            >
              {moreLabel}
            </Link>
          ) : null}
        </div>
        <div className="relative">
          <div
            ref={scroller}
            className="home-h-scroll home-product-rail snap-x snap-mandatory gap-3 pb-1"
            role="list"
          >
            {products.map((p) => (
              <div key={p.id} role="listitem" className="home-product-slide snap-start">
                <HomeCarouselCard product={p} badge={badge} />
              </div>
            ))}
          </div>
          <button
            type="button"
            aria-label="הקודם"
            className="home-rail-arrow end-auto start-1 hidden md:grid"
            onClick={() => scrollByDir(-1)}
          >
            <ChevronRight className="size-5" />
          </button>
          <button
            type="button"
            aria-label="הבא"
            className="home-rail-arrow end-1 start-auto hidden md:grid"
            onClick={() => scrollByDir(1)}
          >
            <ChevronLeft className="size-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
