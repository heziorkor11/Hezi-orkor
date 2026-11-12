import taxonomy from '../../public/catalog/display-taxonomy.json';
import hiddenCategoriesConfig from '../../public/catalog/hidden-categories.json';

type Override = { category: string; sub?: string; hidden?: boolean };

const bySku = taxonomy.bySku as Record<string, Override>;

export const hiddenCategoryIds = new Set(
  (hiddenCategoriesConfig.hiddenCategories as string[] | undefined) || [],
);

export function isHiddenCategory(id?: string) {
  return Boolean(id && hiddenCategoryIds.has(id));
}

export const displayCategories = (taxonomy.categories as { id: string; name: string; count?: number }[]).filter(
  (c) => !isHiddenCategory(c.id),
);
export const subcategories = taxonomy.subcategories as Record<string, {id:string;name:string;count:number}[]>;
export function displayOverride(sku:string) { return bySku[sku]; }
export function isHiddenProduct(sku:string) {
  const ov = bySku[sku];
  if (!ov) return false;
  if (isHiddenCategory(ov.category)) return true;
  return Boolean(ov.hidden);
}
export function displayCategory(sku:string, fallback:string) { return bySku[sku]?.category || fallback; }
export function normalizeDisplayCategory(category?: string) {
  return category && ['oil-filter','cabin-filter'].includes(category) ? 'filters' : category;
}
