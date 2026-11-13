import { catalogPrice } from "@/lib/prices";

/** URL `sort` values. Omit / unknown → recommended. */
export type ListingSort = "recommended" | "price-asc" | "price-desc";

export const LISTING_SORT_OPTIONS: { id: ListingSort; label: string; urlValue?: string }[] = [
  { id: "recommended", label: "מומלץ", urlValue: undefined },
  { id: "price-asc", label: "מחיר: מהזול ליקר", urlValue: "price-asc" },
  { id: "price-desc", label: "מחיר: מהיקר לזול", urlValue: "price-desc" },
];

export function parseListingSort(value: unknown): ListingSort {
  if (value === "price-asc" || value === "price-desc") return value;
  return "recommended";
}

export type ListingSortHelpers<T> = {
  hasImage?: (hit: T) => boolean;
  nameOf?: (hit: T) => string;
  /** When true, image-first applies even for explicit price sorts (workshop-packs). */
  forceImageFirst?: boolean;
};

function priceAscTuple(sku: string): [number, number] {
  const p = catalogPrice(sku);
  return p == null ? [1, 0] : [0, p];
}

function priceDescTuple(sku: string): [number, number] {
  const p = catalogPrice(sku);
  return p == null ? [1, 0] : [0, -p];
}

function cmpPrice(
  aSku: string,
  bSku: string,
  tuple: (sku: string) => [number, number],
  aIndex: number,
  bIndex: number,
): number {
  const [am, ap] = tuple(aSku);
  const [bm, bp] = tuple(bSku);
  if (am !== bm) return am - bm;
  if (ap !== bp) return ap - bp;
  return aIndex - bIndex;
}

function cmpName(a: string, b: string) {
  return a.localeCompare(b, "he", { numeric: true, sensitivity: "base" });
}

/**
 * Sort filtered listing hits before pagination (server loader, first paint).
 * Recommended (default): products with a real photo first, then by display name (he).
 * There is no sales / views / popularity signal in the catalog, so that is not used.
 * Price sorts stay available. Workshop-packs always keep photos first.
 */
export function sortListingHits<T extends { sku: string }>(
  hits: readonly T[],
  sort: ListingSort,
  helpers: ListingSortHelpers<T> = {},
): T[] {
  const decorated = hits.map((hit, index) => ({ hit, index }));
  const imageFirst = sort === "recommended" || helpers.forceImageFirst;

  decorated.sort((a, b) => {
    if (imageFirst && helpers.hasImage) {
      const ia = helpers.hasImage(a.hit) ? 0 : 1;
      const ib = helpers.hasImage(b.hit) ? 0 : 1;
      if (ia !== ib) return ia - ib;
    }

    if (sort === "price-asc") {
      return cmpPrice(a.hit.sku, b.hit.sku, priceAscTuple, a.index, b.index);
    }
    if (sort === "price-desc") {
      return cmpPrice(a.hit.sku, b.hit.sku, priceDescTuple, a.index, b.index);
    }

    const na = helpers.nameOf ? helpers.nameOf(a.hit) : "";
    const nb = helpers.nameOf ? helpers.nameOf(b.hit) : "";
    const byName = cmpName(na, nb);
    if (byName) return byName;
    return a.index - b.index;
  });

  return decorated.map((d) => d.hit);
}
