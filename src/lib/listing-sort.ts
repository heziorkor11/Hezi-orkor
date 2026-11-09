import { catalogPrice } from "@/lib/prices";

/** URL `sort` values. Omit / unknown → recommended. */
export type ListingSort = "recommended" | "price-asc" | "price-desc" | "newest";

export const LISTING_SORT_OPTIONS: { id: ListingSort; label: string; urlValue?: string }[] = [
  { id: "recommended", label: "מומלץ" },
  { id: "price-asc", label: "מחיר: מהזול ליקר", urlValue: "price-asc" },
  { id: "price-desc", label: "מחיר: מהיקר לזול", urlValue: "price-desc" },
  { id: "newest", label: "חדשים", urlValue: "newest" },
];

export function parseListingSort(value: unknown): ListingSort {
  if (value === "price-asc" || value === "price-desc" || value === "newest") return value;
  return "recommended";
}

/** Sale / new ranking keys — only when real catalog fields exist. Currently none do. */
export type ListingRankMeta = {
  /** True when a real on-sale flag / compare-at price marks a discount. */
  onSale: boolean;
  /** True when a real createdAt / new badge marks a newly arrived product. */
  isNew: boolean;
};

/**
 * Catalog products today have no sale flag, compare-at price, createdAt, or new badge.
 * Always returns false groups so callers skip those tiers without inventing data.
 */
export function listingRankMeta(_sku: string): ListingRankMeta {
  return { onSale: false, isNew: false };
}

function priceAscTuple(sku: string): [number, number] {
  const p = catalogPrice(sku);
  // missing / on-request → last
  return p == null ? [1, 0] : [0, p];
}

function priceDescTuple(sku: string): [number, number] {
  const p = catalogPrice(sku);
  // missing / on-request → last; negate for descending priced items
  return p == null ? [1, 0] : [0, -p];
}

/**
 * Sort filtered listing hits before pagination.
 * Recommended (default): sale → new → rest (sale/new skipped when no fields),
 * then image → no image, then cheapest → most expensive, then stable index.
 * Explicit price sorts ignore image/sale grouping.
 * Newest: reverse catalog index order until a real createdAt exists.
 */
export function sortListingHits<T extends { sku: string }>(
  hits: readonly T[],
  sort: ListingSort,
  hasImage: (hit: T) => boolean,
): T[] {
  const decorated = hits.map((hit, index) => ({ hit, index }));

  decorated.sort((a, b) => {
    if (sort === "price-asc") {
      const [am, ap] = priceAscTuple(a.hit.sku);
      const [bm, bp] = priceAscTuple(b.hit.sku);
      if (am !== bm) return am - bm;
      if (ap !== bp) return ap - bp;
      return a.index - b.index;
    }
    if (sort === "price-desc") {
      const [am, ap] = priceDescTuple(a.hit.sku);
      const [bm, bp] = priceDescTuple(b.hit.sku);
      if (am !== bm) return am - bm;
      if (ap !== bp) return ap - bp;
      return a.index - b.index;
    }
    if (sort === "newest") {
      // No createdAt in catalog — temporary: reverse of filtered catalog order.
      return b.index - a.index;
    }

    // recommended
    const ra = listingRankMeta(a.hit.sku);
    const rb = listingRankMeta(b.hit.sku);
    const group = (m: ListingRankMeta) => (m.onSale ? 0 : m.isNew ? 1 : 2);
    const ga = group(ra);
    const gb = group(rb);
    if (ga !== gb) return ga - gb;

    const ia = hasImage(a.hit) ? 0 : 1;
    const ib = hasImage(b.hit) ? 0 : 1;
    if (ia !== ib) return ia - ib;

    const [am, ap] = priceAscTuple(a.hit.sku);
    const [bm, bp] = priceAscTuple(b.hit.sku);
    if (am !== bm) return am - bm;
    if (ap !== bp) return ap - bp;
    return a.index - b.index;
  });

  return decorated.map((d) => d.hit);
}
