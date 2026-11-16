/**
 * "לבירור" placeholders on vehicle results.
 *
 * When a vehicle is identified (plate search or make+model[+year]) and a
 * visible display category has no fitting product for it, the results page
 * shows a muted inquiry card for that category: a generic category
 * illustration (never a product photo), no price, "צריך לברר" and a WhatsApp
 * button with a prefilled message. Placeholders are UI only — they are not
 * products, never enter the cart, the search index or the sitemap.
 *
 * Pure module (no Vite / JSON imports) so node --test can run it.
 */
import { formatIlPlate, normalizeIlPlate } from "./order-quote.ts";

/** Categories that never get inquiry placeholders. */
export const INQUIRY_EXCLUDED_CATEGORIES: readonly string[] = [
  // Not vehicle-specific (VEHICLE_OPTIONAL_CATEGORIES in search-language.ts).
  "fluids",
  "additives",
  "cleaning-maintenance",
  "workshop-packs",
  // Removed storefront category.
  "general",
];

export const INQUIRY_LABEL = "לבירור";
export const INQUIRY_STATUS = "צריך לברר";
export const INQUIRY_TEXT = "אין לנו כרגע במלאי מוצר מאומת לרכב שלך — צריך לברר";

export type InquiryVehicle = {
  plate?: string;
  make?: string;
  model?: string;
  year?: string;
};

export type InquiryCategory = { id: string; name: string };

export type InquiryPlaceholder = {
  /** Display category id, e.g. "water-pump". */
  categoryId: string;
  /** Category (or sub-category) name shown on the card and in the message. */
  label: string;
  /** Generic category illustration, or undefined → neutral icon. */
  image?: string;
};

/** Search params that can carry an identified vehicle. */
export type InquirySearchState = {
  make?: string;
  model?: string;
  year?: string;
  q?: string;
  type?: string;
  category?: string;
  sub?: string;
  fluidKind?: string;
  oilBrand?: string;
};

export function hasInquiryVehicle(state: InquirySearchState): boolean {
  return Boolean(state.make?.trim() && state.model?.trim());
}

/** Category ids that may receive a placeholder (visible list minus excluded/hidden). */
export function inquiryEligibleCategories(
  visible: readonly InquiryCategory[],
  isHidden: (id: string) => boolean = () => false,
): InquiryCategory[] {
  return visible.filter((c) => !INQUIRY_EXCLUDED_CATEGORIES.includes(c.id) && !isHidden(c.id));
}

/**
 * Overview (no category picked): one placeholder per eligible category that
 * has zero fitting products for the vehicle. Text search / type filters and
 * fluids browsing are not "vehicle results", so they get nothing.
 */
export function buildOverviewInquiries(opts: {
  state: InquirySearchState;
  categories: readonly InquiryCategory[];
  /** Display categories that have ≥1 visible product fitting the vehicle. */
  fittedCategoryIds: ReadonlySet<string>;
  imageFor: (categoryId: string) => string | undefined;
  isHidden?: (id: string) => boolean;
}): InquiryPlaceholder[] {
  const { state } = opts;
  if (!hasInquiryVehicle(state)) return [];
  if (state.category || state.q || state.type || state.fluidKind || state.oilBrand) return [];
  return inquiryEligibleCategories(opts.categories, opts.isHidden)
    .filter((c) => !opts.fittedCategoryIds.has(c.id))
    .map((c) => ({ categoryId: c.id, label: c.name, image: opts.imageFor(c.id) }));
}

/**
 * Drilled-in category with zero results for the vehicle → one placeholder
 * instead of the empty state. Returns null when the normal empty state applies.
 */
export function buildCategoryInquiry(opts: {
  state: InquirySearchState;
  total: number;
  categories: readonly InquiryCategory[];
  imageFor: (categoryId: string) => string | undefined;
  /** Optional sub-category name (e.g. "פילטר שמן") when a sub filter is active. */
  subName?: string;
  isHidden?: (id: string) => boolean;
}): InquiryPlaceholder | null {
  const { state } = opts;
  if (opts.total > 0) return null;
  if (!hasInquiryVehicle(state) || !state.category) return null;
  if (state.q || state.type || state.fluidKind || state.oilBrand) return null;
  const cat = inquiryEligibleCategories(opts.categories, opts.isHidden).find(
    (c) => c.id === state.category,
  );
  if (!cat) return null;
  return {
    categoryId: cat.id,
    label: opts.subName?.trim() || cat.name,
    image: opts.imageFor(cat.id),
  };
}

/** Prefilled WhatsApp text: part, vehicle, plate (when known). */
export function buildInquiryMessage(partName: string, vehicle: InquiryVehicle): string {
  const car = [vehicle.make, vehicle.model, vehicle.year]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(" ");
  const part = partName.trim();
  const lines = [`שלום, לא מצאתי באתר ${part} לרכב שלי — אפשר לברר בשבילי?`];
  if (normalizeIlPlate(vehicle.plate || "")) {
    lines.push(`מספר רכב: ${formatIlPlate(vehicle.plate || "")}`);
  }
  if (car) lines.push(`רכב: ${car}`);
  lines.push(`חלק: ${part}`);
  return lines.join("\n");
}

export function inquiryWhatsAppUrl(whatsapp: string, partName: string, vehicle: InquiryVehicle) {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(buildInquiryMessage(partName, vehicle))}`;
}
