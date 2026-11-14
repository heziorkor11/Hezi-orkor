/** Category (and filter sub-type) → existing catalog SKU prefix. */
export const CATEGORY_SKU_PREFIX: Record<string, string> = {
  brakes: "BRK",
  "ac-compressor": "CMP",
  "ac-condenser": "CND",
  "ignition-coils": "COIL",
  "spark-plugs": "PLUG",
  lighting: "LMP",
  additives: "ADD",
  lights: "HDL",
  fluids: "OIL",
  "workshop-packs": "OIL",
};

const FILTER_SUB_PREFIX: Record<string, string> = {
  oil: "OILF",
  cabin: "CAF",
  air: "FLT",
  gear: "FLT",
  diesel: "FLT",
};

export function skuPrefixFor(category: string, subType?: string): string {
  if (category === "filters") {
    const sub = (subType || "").trim().toLowerCase();
    return FILTER_SUB_PREFIX[sub] || "FLT";
  }
  if (category === "fuel-pump") return "FLT";
  return CATEGORY_SKU_PREFIX[category] || "GEN";
}

const SKU_RE = /^HZ-([A-Z]+)-(\d{5})$/;

export function parseSkuNumber(sku: string, prefix: string): number | null {
  const m = SKU_RE.exec(sku);
  if (!m || m[1] !== prefix) return null;
  return Number(m[2]);
}

/** Next free HZ-XXX-nnnnn for a prefix, given every SKU already in use. */
export function nextSkuForPrefix(prefix: string, existing: Iterable<string>): string {
  const p = prefix.replace(/^HZ-/, "").toUpperCase();
  let max = 0;
  for (const sku of existing) {
    const n = parseSkuNumber(sku, p);
    if (n != null && n > max) max = n;
  }
  const next = max + 1;
  if (next > 99999) throw new Error("אין מק״ט פנוי בקידומת הזו");
  return `HZ-${p}-${String(next).padStart(5, "0")}`;
}

export function isValidGeneratedSku(sku: string): boolean {
  return SKU_RE.test(sku);
}
