import type { PackSize } from "./pack-price";
export function packUnitValue(pack: PackSize | null, price: number | null) {
  if (!pack || price == null || pack.qty <= 0) return null;
  return {
    price: Math.round((price / pack.qty) * 100) / 100,
    unit: pack.kind === "liter" ? "לליטר" : "ליחידה",
  };
}
/** Savings vs today's price for the same packs, NOT a fabricated single-unit retail price. */
export function quantitySavings(
  priceBefore: number | null,
  selectedPrice: number | null,
  qty: number,
  tierPercent: number,
) {
  if (priceBefore == null || selectedPrice == null || tierPercent <= 0) return 0;
  return Math.max(0, Math.round((priceBefore - selectedPrice) * qty * 100) / 100);
}
