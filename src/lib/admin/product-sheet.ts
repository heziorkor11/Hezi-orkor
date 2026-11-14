export type ProductSheetRow = {
  sku: string;
  name: string;
  category: string;
  categoryHe: string;
  subType: string;
  fitment: string;
  priceDisplayed: string;
  basePrice: string;
  imageUrl: string;
  tags: string;
  stock: string;
  visibility: string;
  updatedAt: string;
  updatedBy: string;
};

export const PRODUCT_SHEET_HEADERS = [
  "מק״ט",
  "שם",
  "קטגוריה",
  "קטגוריה (עברית)",
  "תת-סוג",
  "התאמת רכב",
  "מחיר לתצוגה (עיגול למעלה)",
  "מחיר בסיס",
  "כתובת תמונה",
  "תגים",
  "מלאי",
  "הצגה",
  "עודכן בתאריך",
  "עודכן ע״י",
] as const;

export function formatSheetPrice(opts: {
  workshop: boolean;
  displayPrice: number | null | undefined;
  basePrice: number | null | undefined;
}): { priceDisplayed: string; basePrice: string } {
  if (opts.workshop) {
    return {
      priceDisplayed: "מחיר מיוחד למוסכים וספקים",
      basePrice: opts.basePrice != null && Number.isFinite(opts.basePrice) ? String(opts.basePrice) : "",
    };
  }
  const display =
    opts.displayPrice != null && Number.isFinite(opts.displayPrice) ? String(Math.ceil(opts.displayPrice)) : "";
  const base = opts.basePrice != null && Number.isFinite(opts.basePrice) ? String(opts.basePrice) : "";
  return { priceDisplayed: display, basePrice: base };
}

export function visibilityLabel(hidden: boolean) {
  return hidden ? "מוסתר" : "מוצג";
}

export function sheetRowToArray(row: ProductSheetRow): string[] {
  return [
    row.sku,
    row.name,
    row.category,
    row.categoryHe,
    row.subType,
    row.fitment,
    row.priceDisplayed,
    row.basePrice,
    row.imageUrl,
    row.tags,
    row.stock,
    row.visibility,
    row.updatedAt,
    row.updatedBy,
  ];
}
