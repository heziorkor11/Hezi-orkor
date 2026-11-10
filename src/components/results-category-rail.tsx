import { Link } from "@tanstack/react-router";
import { CategoryImage } from "@/components/category-image";
import { subcategories } from "@/lib/display-taxonomy";
import { VISUAL_CATEGORIES } from "@/lib/visual-categories";
import { categoryImage } from "@/lib/category-images";
import { cn } from "@/lib/utils";
import type { ListingSearch } from "@/lib/catalog";

export function ResultsCategoryRail({ state }: { state: ListingSearch }) {
  const subs = state.category ? (subcategories[state.category] || []).filter((s) => s.count > 0) : [];
  const current = VISUAL_CATEGORIES.find((c) => c.id === state.category);

  const categoryId = state.category;
  if (categoryId && !subs.length) return null;

  const items = categoryId
    ? [
        { id: "", name: "הכל", image: current?.image || categoryImage(categoryId), search: { ...state, sub: undefined, page: undefined } },
        ...subs.map((s) => ({
          id: s.id,
          name: s.name,
          image: current?.image || categoryImage(categoryId),
          search: { ...state, sub: s.id, page: undefined },
        })),
      ]
    : VISUAL_CATEGORIES.map((c) => ({
        id: c.id,
        name: c.name,
        image: c.image,
        search: { category: c.id },
      }));

  return (
    <div
      className="home-h-scroll home-hero-scroller mb-5 gap-3 px-0.5 pb-2"
      role="list"
      aria-label={state.category ? "תתי קטגוריות" : "קטגוריות"}
    >
      {items.map((item) => {
        const active = state.category
          ? item.id
            ? state.sub === item.id
            : !state.sub
          : false;
        return (
          <Link
            key={item.id || "all"}
            role="listitem"
            to="/results"
            search={item.search}
            className="home-cat-tile group"
          >
            <span
              data-home-category-photo
              className={cn("home-cat-squircle", active && "ring-2 ring-accent ring-offset-2")}
            >
              <CategoryImage src={item.image} alt="" className="h-full w-full object-contain p-2" />
            </span>
            <span
              className={cn(
                "mt-1.5 line-clamp-2 text-center text-[11px] font-bold leading-snug md:text-xs",
                active ? "text-accent" : "text-fg group-hover:text-accent",
              )}
            >
              {item.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
