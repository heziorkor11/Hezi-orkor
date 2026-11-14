import { catalogJson } from "@/lib/catalog-io";
import { catalogPrice, WORKSHOP_PACK_PRICE_LABEL } from "@/lib/prices";
import { isWorkshopPackSku, subcategories } from "@/lib/display-taxonomy";
import { publicSiteOrigin } from "./config";
import { adminProductRow } from "./catalog-query.server";
import { hasRealProductImage } from "@/lib/product-image-policy";
import type { ProductChange } from "./notify-product-change";

function subTypeLabel(category: string, subType?: string) {
  const id = (subType || "").trim();
  if (!id) return "";
  const hit = (subcategories[category] || []).find((s) => s.id === id);
  return hit?.name || id;
}

function absoluteUrl(origin: string, value?: string) {
  const v = (value || "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("/")) return `${origin}${v}`;
  return v;
}

/** Fill Sheets upsert fields from the live catalog overlay for one SKU. */
export async function enrichProductChange(change: ProductChange): Promise<ProductChange> {
  const sku = (change.sku || "").trim();
  if (!sku) return change;
  const origin = publicSiteOrigin();
  const row = await adminProductRow(sku);
  const prices = await catalogJson<Record<string, number>>("prices.json").catch(() => ({} as Record<string, number>));
  const base = prices[sku];
  const workshop = row.workshop || isWorkshopPackSku(sku);
  const display = workshop ? WORKSHOP_PACK_PRICE_LABEL : catalogPrice(sku);
  const image = absoluteUrl(origin, row.image || change.image);
  return {
    ...change,
    sku,
    name: change.name ?? row.name,
    category: change.category ?? row.categoryHe ?? row.category,
    subType: change.subType ?? subTypeLabel(row.category, row.subType),
    fitment: change.fitment ?? row.fitment ?? "",
    priceDisplayed: change.priceDisplayed ?? (display == null ? "" : display),
    basePrice: change.basePrice ?? (typeof base === "number" && Number.isFinite(base) ? base : ""),
    image: change.image ?? image,
    hasImage: change.hasImage ?? hasRealProductImage(row.image || image),
    tags: change.tags ?? row.tags.map((t) => t.label).join(", "),
    stock: change.stock ?? row.stock ?? "",
    visibility: change.visibility ?? (row.hidden ? "מוסתר" : "מוצג"),
    link: change.link ?? `${origin}/product/${encodeURIComponent(sku)}`,
    updatedBy: change.updatedBy || change.actor || "",
  };
}
