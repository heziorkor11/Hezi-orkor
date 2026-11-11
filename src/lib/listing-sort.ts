import { homeDealsSkus } from "@/lib/home-deals";
import { catalogPrice } from "@/lib/prices";

/** URL `sort` values. Omit / unknown → recommended. */
export type ListingSort = "recommended" | "price-asc" | "price-desc";

export const LISTING_SORT_OPTIONS: { id: ListingSort; label: string; urlValue?: string }[] = [
  { id: "recommended", label: "מומלץ" },
  { id: "price-asc", label: "מחיר: מהזול ליקר", urlValue: "price-asc" },
  { id: "price-desc", label: "מחיר: מהיקר לזול", urlValue: "price-desc" },
];

export function parseListingSort(value: unknown): ListingSort {
  if (value === "price-asc" || value === "price-desc") return value;
  return "recommended";
}

/** SKUs currently shown as מבצעי החודש on the home carousel. */
const DEAL_SKUS = new Set<string>(homeDealsSkus);

export function isMonthlyDealSku(sku: string | undefined | null): boolean {
  return Boolean(sku && DEAL_SKUS.has(sku));
}

function priceAscTuple(sku: string): [number, number] {
  const p = catalogPrice(sku);
  // missing / on-request / hidden → last
  return p == null ? [1, 0] : [0, p];
}

function priceDescTuple(sku: string): [number, number] {
  const p = catalogPrice(sku);
  // missing / on-request / hidden → last; negate for descending priced items
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

/**
 * Sort filtered listing hits before pagination (server loader, first paint).
 * Recommended (default): monthly deals first, then the rest.
 * Within each group, and for explicit price sorts: cheapest → most expensive,
 * products without a catalog price last. No new-arrival field exists yet,
 * so that tier is skipped rather than invented.
 */
export function sortListingHits<T extends { sku: string }>(
  hits: readonly T[],
  sort: ListingSort,
): T[] {
  const decorated = hits.map((hit, index) => ({ hit, index }));

  decorated.sort((a, b) => {
    if (sort === "price-asc") {
      return cmpPrice(a.hit.sku, b.hit.sku, priceAscTuple, a.index, b.index);
    }
    if (sort === "price-desc") {
      return cmpPrice(a.hit.sku, b.hit.sku, priceDescTuple, a.index, b.index);
    }

    const ga = isMonthlyDealSku(a.hit.sku) ? 0 : 1;
    const gb = isMonthlyDealSku(b.hit.sku) ? 0 : 1;
    if (ga !== gb) return ga - gb;
    return cmpPrice(a.hit.sku, b.hit.sku, priceAscTuple, a.index, b.index);
  });

  return decorated.map((d) => d.hit);
}
