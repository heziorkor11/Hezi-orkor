/** Derive fluid subcategory + oil brand from product title (UI/pipeline). Raw catalog fields stay untouched. */

export type FluidKind = "engine" | "gear" | "brake" | "other";

export const FLUID_KIND_LABELS: Record<FluidKind, string> = {
  engine: "שמן מנוע",
  gear: "שמן גיר",
  brake: "נוזל בלמים",
  other: "אחר",
};

/** Known lubricant brands we surface as filters (order = display order). */
export const OIL_BRAND_OPTIONS = [
  "MOTUL",
  "TOTAL",
  "CASTROL",
  "PREFIX",
  "LUK",
  "FEBI",
  "AISIN",
  "דלקול",
  "SHELL",
  "MOBIL",
  "ELF",
  "MANNOL",
  "אחר",
] as const;

export type OilBrand = (typeof OIL_BRAND_OPTIONS)[number];

const BRAND_RULES: { re: RegExp; brand: OilBrand }[] = [
  { re: /MOTUL/i, brand: "MOTUL" },
  { re: /TOTAL|QUARTZ/i, brand: "TOTAL" },
  { re: /CASTROL|קסטרול/i, brand: "CASTROL" },
  { re: /PREFIX/i, brand: "PREFIX" },
  { re: /\bLUK\b/i, brand: "LUK" },
  { re: /FEBI/i, brand: "FEBI" },
  { re: /AISIN/i, brand: "AISIN" },
  { re: /דלקול/i, brand: "דלקול" },
  { re: /SHELL|HELIX/i, brand: "SHELL" },
  { re: /\bMOBIL\b/i, brand: "MOBIL" },
  { re: /\bELF\b/i, brand: "ELF" },
  { re: /MANNOL/i, brand: "MANNOL" },
];

/** Brake fluid (not pads/discs/calipers). */
export function isBrakeFluidName(name: string): boolean {
  const n = String(name || "");
  if (/צ\.?\s*בלם|דיסק\s*בלם|רפיד|קליפר|נעלי\s*בלם|בוסטר\s*בלם|צינור\s*בלם/i.test(n)) return false;
  return /נוזל\s*בלמ|DOT\s*[345]|BRAKE\s*FLUID|שמן\s*בלמ/i.test(n);
}

export function classifyFluidKind(name: string): FluidKind {
  const n = String(name || "");
  if (isBrakeFluidName(n)) return "brake";
  if (/\bATF\b|\bCVT\b|\bCVTF\b|\bDCT\b|\bDSG\b|שמן\s*גיר|ש\.גיר|הילוכ|GEAR\s*OIL|דאבל\s*קלאצ/i.test(n)) {
    return "gear";
  }
  if (/75W|80W|85W|GL-?\d/i.test(n) && /גיר|GEAR/i.test(n)) return "gear";
  if (/שמן\s*מנוע|ENGINE\s*OIL|\b\d{1,2}\s*W\s*-?\s*\d{2}\b/i.test(n)) return "engine";
  return "other";
}

export function classifyOilBrand(name: string): OilBrand {
  const n = String(name || "");
  for (const rule of BRAND_RULES) {
    if (rule.re.test(n)) return rule.brand;
  }
  return "אחר";
}

/** Fluids browse surface: oils category or a brake-fluid SKU living elsewhere. */
export function isFluidsBrowseItem(category: string | undefined, name: string): boolean {
  if (category === "fluids") return true;
  return isBrakeFluidName(name);
}

export function hideVehicleFitmentForFluid(category: string | undefined, name: string): boolean {
  return isFluidsBrowseItem(category, name);
}
