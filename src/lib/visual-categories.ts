import { categoryImage } from "@/lib/category-images";
import { visibleCategories } from "@/lib/catalog-types";

/** Visual category tiles used on the home category rail. */
export const VISUAL_CATEGORIES = visibleCategories.map((c) => ({
  id: c.id,
  name: c.name,
  sub:
    c.id === "cleaning-maintenance"
      ? "חומרי ניקוי, גריז וציוד תחזוקה"
      : "חלפים ואביזרים",
  image: categoryImage(c.id),
}));
