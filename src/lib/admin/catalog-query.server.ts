import { catalogPrice, hasCatalogPrice, isPriceHiddenOverride } from "@/lib/prices";
import { displayCategories, displayCategory, isHiddenCategory, isHiddenProduct, isWorkshopPackSku } from "@/lib/display-taxonomy";
import { getNameOverride } from "@/lib/name-overrides";
import { loadSearchHits, resolveProductImage } from "@/lib/catalog-listing";
import { getProductTags, getTagLibrary } from "@/lib/product-tags";
import { overlayCategoryOfSku } from "./public-overlay";

import type { AdminProductRow } from "./types";
export type { AdminProductRow };

function categoryName(id: string) {
  return displayCategories.find((c) => c.id === id)?.name || id;
}

export async function adminProductRow(sku: string, title?: string): Promise<AdminProductRow> {
  const category = overlayCategoryOfSku(sku) || displayCategory(sku, "general");
  const image = resolveProductImage(sku);
  const price = catalogPrice(sku);
  const workshop = isWorkshopPackSku(sku);
  return {
    sku,
    name: getNameOverride(sku) || title || sku,
    category,
    categoryHe: categoryName(category),
    price,
    workshop,
    quote: !workshop && price == null,
    hidden: isHiddenProduct(sku),
    hasImage: Boolean(image),
    image,
    tags: getProductTags(sku),
  };
}

export async function listAdminProducts(opts: {
  q?: string;
  category?: string;
  tag?: string;
  image?: "all" | "yes" | "no";
  price?: "all" | "none";
  hidden?: "all" | "yes" | "no";
  page?: number;
  pageSize?: number;
}) {
  const hits = await loadSearchHits();
  const q = (opts.q || "").trim().toLowerCase();
  const pageSize = Math.min(100, Math.max(10, opts.pageSize || 40));
  let rows: AdminProductRow[] = [];
  for (const hit of hits) {
    if (q && !`${hit.sku} ${hit.title}`.toLowerCase().includes(q) && hit.sku.toLowerCase() !== q) {
      const name = getNameOverride(hit.sku);
      if (!name?.toLowerCase().includes(q)) continue;
    }
    const row = await adminProductRow(hit.sku, hit.title);
    if (opts.category && row.category !== opts.category) continue;
    if (opts.tag && !row.tags.some((t) => t.id === opts.tag)) continue;
    if (opts.image === "yes" && !row.hasImage) continue;
    if (opts.image === "no" && row.hasImage) continue;
    if (opts.price === "none" && row.price != null) continue;
    if (opts.hidden === "yes" && !row.hidden) continue;
    if (opts.hidden === "no" && row.hidden) continue;
    rows.push(row);
  }
  const total = rows.length;
  const noImage = rows.filter((r) => !r.hasImage).length;
  const noPrice = rows.filter((r) => r.price == null).length;
  const hidden = rows.filter((r) => r.hidden).length;
  const page = Math.max(1, opts.page || 1);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const slice = rows.slice((page - 1) * pageSize, page * pageSize);
  return { items: slice, total, pages, page, noImage, noPrice, hidden, catalogSize: hits.length };
}

export async function homeStats() {
  const all = await listAdminProducts({ page: 1, pageSize: 10, hidden: "no" });
  // recount without hidden filter for catalog size already in catalogSize
  const hits = await loadSearchHits();
  let visible = 0;
  let noImage = 0;
  let noPrice = 0;
  for (const hit of hits) {
    if (isHiddenProduct(hit.sku) || isHiddenCategory(displayCategory(hit.sku, hit.category))) continue;
    visible += 1;
    if (!resolveProductImage(hit.sku, hit.oe)) noImage += 1;
    if (catalogPrice(hit.sku) == null) noPrice += 1;
  }
  return { catalogSize: hits.length, visible, noImage, noPrice };
}

export function categoryList() {
  return displayCategories;
}

void isPriceHiddenOverride;
void hasCatalogPrice;
