import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { CategoryTile } from "@/lib/category-tiles";

export function CategoryPhotoTiles({ tiles }: { tiles: CategoryTile[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  if (!tiles.length) return null;

  function next() {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: -el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className="photo-tile-wrap">
      <div
        ref={scroller}
        className="photo-tile-rail home-h-scroll"
        role="list"
        aria-label="קבוצות בקטגוריה"
      >
        {tiles.map((tile) => (
          <Link
            key={tile.id}
            role="listitem"
            to="/results"
            search={tile.search}
            className="photo-tile group"
            aria-current={tile.active ? "true" : undefined}
          >
            <span className={cn("photo-tile-sq sq-tile", tile.active && "photo-tile-sq-active")}>
              <img src={tile.image} alt="" width={78} height={78} />
            </span>
            <span className={cn("photo-tile-lab", tile.active && "text-accent")}>
              {tile.label.split("\n").map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </span>
            <span className="photo-tile-n">{tile.count === 1 ? "מוצר אחד" : `${tile.count.toLocaleString("he-IL")} מוצרים`}</span>
          </Link>
        ))}
      </div>
      {tiles.length > 4 ? (
        <button
          type="button"
          onClick={next}
          aria-label="עוד קבוצות"
          className="home-rail-arrow photo-tile-arrow left-0 top-[38px] grid -translate-y-1/2"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
