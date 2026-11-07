import taxonomy from '../../public/catalog/display-taxonomy.json';
type Override = { category: string; sub?: string; hidden?: boolean };
const bySku = taxonomy.bySku as Record<string, Override>;
export const displayCategories = taxonomy.categories;
export const subcategories = taxonomy.subcategories as Record<string, {id:string;name:string;count:number}[]>;
export function displayOverride(sku:string) { return bySku[sku]; }
export function isHiddenProduct(sku:string) { return Boolean(bySku[sku]?.hidden); }
export function displayCategory(sku:string, fallback:string) { return bySku[sku]?.category || fallback; }
export function normalizeDisplayCategory(category?: string) {
  return category && ['oil-filter','cabin-filter'].includes(category) ? 'filters' : category;
}
