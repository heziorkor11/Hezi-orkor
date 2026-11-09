import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useRef } from "react";
import { CategoryImage } from "@/components/category-image";
import { VISUAL_CATEGORIES } from "@/components/home-search-hero";

export function HomeCategoryRail() {
  const scroller = useRef<HTMLDivElement>(null);
  function next() {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // RTL: further content lies to the left (negative scrollLeft).
    el.scrollBy({ left: -el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  }
  return (
    <section id="categories" className="scroll-mt-24 px-3.5 pt-6 md:px-5">
      <div className="mx-auto flex max-w-[1180px] items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold tracking-tight md:text-2xl">מחלקות החנות</h2>
          <p className="text-xs text-muted md:text-sm">גללו לזיהוי מהיר</p>
        </div>
        <Link to="/" hash="categories" className="text-xs font-bold text-accent hover:underline md:text-sm">
          לכל הקטגוריות
        </Link>
      </div>
      <div className="relative mx-auto max-w-[1180px]">
      <div
        ref={scroller}
        className="home-h-scroll home-hero-scroller mx-auto mt-3 max-w-[1180px] gap-3 px-0.5 pb-2"
        role="list"
        aria-label="קטגוריות"
      >
        {VISUAL_CATEGORIES.map((c) => (
          <Link
            key={c.id}
            role="listitem"
            to="/results"
            search={{ category: c.id }}
            className="home-cat-tile group"
          >
            <span className="home-cat-squircle">
              <CategoryImage
                src={c.image}
                alt={c.name}
                className="h-full w-full object-contain p-2"
              />
            </span>
            <span className="mt-1.5 line-clamp-2 text-center text-[11px] font-bold leading-snug text-fg group-hover:text-accent md:text-xs">
              {c.name}
            </span>
          </Link>
        ))}
      </div>
      <button
        type="button"
        onClick={next}
        aria-label="עוד מחלקות"
        className="home-rail-arrow left-0 top-[34%] grid -translate-y-1/2"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      </div>
    </section>
  );
}
