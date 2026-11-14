import taxonomy from '../../public/catalog/display-taxonomy.json' with { type: "json" };
import hiddenCategoriesConfig from '../../public/catalog/hidden-categories.json' with { type: "json" };
import visibilityOverrides from '../../public/catalog/visibility-overrides.json' with { type: "json" };
import categoryLabelOverrides from '../../public/catalog/category-label-overrides.json' with { type: "json" };
import { overlayHiddenCategories, overlayHiddenSku, overlayCategoryLabel, overlayCategoryOfSku } from "./admin/public-overlay.ts";

type Override = { category: string; sub?: string; hidden?: boolean };

const bySku = taxonomy.bySku as Record<string, Override>;

const bundledHiddenCategories = (hiddenCategoriesConfig.hiddenCategories as string[] | undefined) || [];
const bundledVisibility = ((visibilityOverrides as { bySku?: Record<string, { hidden?: boolean }> }).bySku || {}) as Record<string, { hidden?: boolean }>;
const bundledLabels = ((categoryLabelOverrides as { byId?: Record<string, string> }).byId || {}) as Record<string, string>;

export const hiddenCategoryIds = new Set(bundledHiddenCategories);

export function isHiddenCategory(id?: string) {
  if (!id) return false;
  return overlayHiddenCategories(bundledHiddenCategories).includes(id);
}

export const allTaxonomyCategories = taxonomy.categories as { id: string; name: string; count?: number }[];

export function categoryDisplayName(id: string, fallback?: string) {
  return overlayCategoryLabel(id, bundledLabels[id] || fallback || id);
}

export const displayCategories = allTaxonomyCategories
  .filter((c) => !isHiddenCategory(c.id))
  .map((c) => ({ ...c, name: categoryDisplayName(c.id, c.name) }));
export const subcategories = taxonomy.subcategories as Record<string, {id:string;name:string;count:number}[]>;
export function displayOverride(sku:string) { return bySku[sku]; }
export function isHiddenProduct(sku:string) {
  const ov = bySku[sku];
  const cat = overlayCategoryOfSku(sku) || ov?.category;
  if (isHiddenCategory(cat)) return true;
  const live = overlayHiddenSku(sku);
  if (live === true) return true;
  if (live === false) return false;
  if (bundledVisibility[sku]?.hidden) return true;
  return Boolean(ov?.hidden);
}
export function displayCategory(sku:string, fallback:string) {
  return overlayCategoryOfSku(sku) || bySku[sku]?.category || fallback;
}
export function normalizeDisplayCategory(category?: string) {
  return category && ['oil-filter','cabin-filter'].includes(category) ? 'filters' : category;
}

export function isWorkshopPackSku(sku?: string | null) {
  return Boolean(sku && bySku[sku]?.category === "workshop-packs");
}
