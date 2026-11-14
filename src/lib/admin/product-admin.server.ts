import { loadSearchHits } from "@/lib/catalog-listing";
import { catalogPrice, getPriceOverride } from "@/lib/prices";
import { displayCategories, displayCategory, isHiddenCategory, isHiddenProduct, isWorkshopPackSku, subcategories } from "@/lib/display-taxonomy";
import { getNameOverride } from "@/lib/name-overrides";
import { getProductTags } from "@/lib/product-tags";
import { readCatalogFile, writeCatalogFile } from "./storage.server";
import { overlayAdditions, overlayAddedProduct, overlayImage, overlayStock } from "./public-overlay";
import { nextSkuForPrefix, skuPrefixFor, isValidGeneratedSku } from "./product-sku";
import type { AddedProduct, ProductAdditionsFile, ImageOverridesFile, StockOverridesFile } from "./added-product";
import { formatSheetPrice, visibilityLabel, type ProductSheetRow } from "./product-sheet";
import type { SessionPayload } from "./types";
import { catalogJson } from "@/lib/catalog-io";

export function categoryHe(id: string) {
  return displayCategories.find((c) => c.id === id)?.name || id;
}

export async function allKnownSkus(): Promise<string[]> {
  const map = await catalogJson<Record<string, string>>("sku-map.json");
  return [...Object.keys(map), ...Object.keys(overlayAdditions())];
}

export async function nextSku(category: string, subType?: string) {
  const prefix = skuPrefixFor(category, subType);
  return { sku: nextSkuForPrefix(prefix, await allKnownSkus()), prefix };
}

export async function createAddedProduct(opts: {
  actor: SessionPayload;
  name: string;
  category: string;
  subType?: string;
  fitment?: string;
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  oe?: string;
  price?: number | null;
  tags?: string[];
  stock?: string;
  sku?: string;
}) {
  const name = opts.name.trim();
  if (!name) throw new Error("יש למלא שם מוצר");
  if (!opts.category) throw new Error("יש לבחור קטגוריה");
  const generated = opts.sku?.trim() && isValidGeneratedSku(opts.sku)
    ? opts.sku.trim()
    : (await nextSku(opts.category, opts.subType)).sku;
  if ((await allKnownSkus()).includes(generated)) throw new Error("המק״ט כבר קיים");
  const now = new Date().toISOString();
  const added: AddedProduct = {
    sku: generated,
    name,
    category: opts.category,
    subType: opts.subType?.trim() || undefined,
    fitment: opts.fitment?.trim() || undefined,
    make: opts.make?.trim() || undefined,
    model: opts.model?.trim() || undefined,
    yearFrom: opts.yearFrom,
    yearTo: opts.yearTo,
    oe: opts.oe?.trim() || undefined,
    stock: opts.stock?.trim() || undefined,
    createdAt: now,
    createdBy: opts.actor.name,
    updatedAt: now,
    updatedBy: opts.actor.name,
  };
  const file = await readCatalogFile<ProductAdditionsFile>("public/catalog/product-additions.json", {
    version: 1,
    bySku: {},
  });
  await writeCatalogFile({
    path: "public/catalog/product-additions.json",
    data: { ...file, version: 1, description: "Products added from the admin dashboard.", bySku: { ...(file.bySku || {}), [generated]: added } },
    message: `chore(admin): add product ${generated}`,
  });
  await writeCatalogFile({
    path: "public/catalog/name-overrides.json",
    data: await (async () => {
      const f = await readCatalogFile<{ bySku?: Record<string, string> }>("public/catalog/name-overrides.json", { bySku: {} });
      return { ...f, bySku: { ...(f.bySku || {}), [generated]: name } };
    })(),
    message: `chore(admin): name ${generated}`,
  });
  await writeCatalogFile({
    path: "public/catalog/display-category-overrides.json",
    data: await (async () => {
      const f = await readCatalogFile<{ bySku?: Record<string, { category: string; reason?: string }> }>(
        "public/catalog/display-category-overrides.json",
        { bySku: {} },
      );
      return { ...f, bySku: { ...(f.bySku || {}), [generated]: { category: opts.category, reason: "נוסף מדאשבורד הניהול" } } };
    })(),
    message: `chore(admin): category ${generated}`,
  });
  if (opts.tags?.length) {
    const f = await readCatalogFile<{ version?: number; bySku?: Record<string, string[]> }>("public/catalog/product-tags.json", { version: 1, bySku: {} });
    await writeCatalogFile({
      path: "public/catalog/product-tags.json",
      data: { ...f, version: 1, bySku: { ...(f.bySku || {}), [generated]: opts.tags.slice(0, 2) } },
      message: `chore(admin): tags ${generated}`,
    });
  }
  if (opts.stock?.trim()) {
    const f = await readCatalogFile<StockOverridesFile>("public/catalog/stock-overrides.json", { version: 1, bySku: {} });
    await writeCatalogFile({
      path: "public/catalog/stock-overrides.json",
      data: { ...f, version: 1, bySku: { ...(f.bySku || {}), [generated]: opts.stock.trim() } },
      message: `chore(admin): stock ${generated}`,
    });
  }
  if (opts.actor.role === "master" && opts.price != null) {
    const { ceilShekel } = await import("@/lib/prices");
    const n = ceilShekel(Number(opts.price));
    if (!Number.isFinite(n) || n <= 0) throw new Error("מחיר לא תקין");
    const f = await readCatalogFile<{ bySku?: Record<string, number> }>("public/catalog/price-overrides.json", { bySku: {} });
    await writeCatalogFile({
      path: "public/catalog/price-overrides.json",
      data: { ...f, bySku: { ...(f.bySku || {}), [generated]: n } },
      message: `chore(admin): price ${generated}`,
    });
  }
  return added;
}

export async function hideAddedProduct(sku: string, reason: string) {
  const file = await readCatalogFile<{ version?: number; bySku?: Record<string, { hidden: boolean; reason?: string }> }>(
    "public/catalog/visibility-overrides.json",
    { version: 1, bySku: {} },
  );
  await writeCatalogFile({
    path: "public/catalog/visibility-overrides.json",
    data: { ...file, version: 1, bySku: { ...(file.bySku || {}), [sku]: { hidden: true, reason } } },
    message: `chore(admin): hide ${sku}`,
  });
}

export async function saveStock(sku: string, stock: string) {
  const f = await readCatalogFile<StockOverridesFile>("public/catalog/stock-overrides.json", { version: 1, bySku: {} });
  const bySku = { ...(f.bySku || {}) };
  if (!stock.trim()) delete bySku[sku];
  else bySku[sku] = stock.trim();
  await writeCatalogFile({
    path: "public/catalog/stock-overrides.json",
    data: { ...f, version: 1, bySku },
    message: `chore(admin): stock ${sku}`,
  });
}

export async function saveImageOverride(sku: string, url: string) {
  const f = await readCatalogFile<ImageOverridesFile>("public/catalog/image-overrides.json", { version: 1, bySku: {} });
  await writeCatalogFile({
    path: "public/catalog/image-overrides.json",
    data: { ...f, version: 1, description: "Dashboard image replacements. Paths resolve via /api/catalog-image.", bySku: { ...(f.bySku || {}), [sku]: url } },
    message: `chore(admin): image ${sku}`,
  });
}

export async function buildAllProductSheetRows(siteOrigin = ""): Promise<ProductSheetRow[]> {
  const hits = await loadSearchHits();
  const prices = await catalogJson<Record<string, number>>("prices.json").catch(() => ({} as Record<string, number>));
  const additions = overlayAdditions();
  const rows: ProductSheetRow[] = [];
  for (const hit of hits) {
    const sku = hit.sku;
    const category = displayCategory(sku, hit.category || "general");
    const hidden = isHiddenProduct(sku) || isHiddenCategory(category);
    const workshop = isWorkshopPackSku(sku);
    const display = catalogPrice(sku);
    const base = prices[sku];
    const added = additions[sku];
    const image = overlayImage(sku) || "";
    const imageUrl = image.startsWith("http") || !image ? image : `${siteOrigin}${image}`;
    const { priceDisplayed, basePrice } = formatSheetPrice({ workshop, displayPrice: display, basePrice: base });
    const tags = getProductTags(sku).map((t) => t.label).join(", ");
    const sub = added?.subType || "";
    const fitment = added?.fitment || [hit.make, hit.model, hit.yearFrom, hit.yearTo].filter(Boolean).join(" ");
    rows.push({
      sku,
      name: getNameOverride(sku) || added?.name || hit.title || sku,
      category,
      categoryHe: categoryHe(category),
      subType: sub,
      fitment,
      priceDisplayed,
      basePrice,
      imageUrl,
      tags,
      stock: overlayStock(sku) || added?.stock || "",
      visibility: visibilityLabel(hidden),
      updatedAt: added?.updatedAt || "",
      updatedBy: added?.updatedBy || "",
    });
  }
  return rows;
}

void getPriceOverride;
void overlayAddedProduct;
void subcategories;
