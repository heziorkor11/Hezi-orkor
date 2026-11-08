import { catalogPrice, formatCatalogPrice } from "@/lib/prices";

export type PackSize =
  { kind: "unit"; qty: number; unitLiters?: number } | { kind: "liter"; qty: number };

/**
 * Parse explicit pack / drum size from product name.
 * Returns null when ambiguous — never invent a unit price.
 */
export function parsePackSize(name?: string): PackSize | null {
  const n = String(name || "");
  if (!n) return null;

  let m =
    n.match(/מארז\s*(?:של\s*)?(\d+)\s*יח['׳"]?/i) ||
    n.match(/\((\d+)\s*יחידות\)/i) ||
    n.match(/מארז\s*(?:של\s*)?(\d+)\b/i);
  if (m) {
    const qty = Number(m[1]);
    if (qty >= 2) {
      const volume = n.match(/(\d+(?:\.\d+)?)\s*(?:[lL]\b|ליטר)/);
      return {
        kind: "unit",
        qty,
        ...(volume && Number(volume[1]) > 0 ? { unitLiters: Number(volume[1]) } : {}),
      };
    }
  }

  m = n.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:[lL]|ליטר)/);
  if (m) {
    const qty = Number(m[1]);
    const unitLiters = Number(m[2]);
    if (qty >= 2) return { kind: "unit", qty, unitLiters };
  }

  // lowercase x / × quantity only (not Mercedes X164)
  m = n.match(/(?:^|[\s(,;])(?:x|×)\s*(\d{2,})\b/);
  if (m) {
    const qty = Number(m[1]);
    if (qty >= 10) return { kind: "unit", qty };
  }

  const glued = n.match(/(?<![\dמ])(20|60|208|1000)[lL]\b/);
  const spaced = n.match(/(?<![מ\d])\b(20|60|208|1000)\s*(?:[lL]|ליטר)\b/);
  const lit = glued || spaced;
  if (lit) {
    const liters = Number(lit[1]);
    const oilish =
      /שמן|נוזל|ATF|Coolant|Antifreeze|אנטיפריז|MOTUL|TOTAL|CASTROL|DEX|GL-?\d|\dW\d|מיכל|חבית/i.test(
        n,
      );
    const yearLeft = /מ\d{2}\s+L\b/.test(n);
    if (oilish && !yearLeft) return { kind: "liter", qty: liters };
  }

  m = n.match(/(?<![א-ת])סט\s*(\d+)\b/);
  if (m) {
    const qty = Number(m[1]);
    const carPart = /(מצמד|רפיד|רפידות|דיסק|פנס|בולם|סליל|מצת|תפוח|הגה|מסרק)/.test(n);
    if (!carPart && qty >= 10) return { kind: "unit", qty };
  }

  return null;
}

/** Unit / liter price hint when pack size is explicit. Does not change catalog price. */
export function packUnitPriceLabel(sku: string | undefined | null, name?: string): string | null {
  const total = catalogPrice(sku);
  if (total == null) return null;
  const pack = parsePackSize(name);
  if (!pack || !pack.qty || pack.qty < 2) return null;
  const unit = total / pack.qty;
  if (!Number.isFinite(unit) || unit <= 0) return null;
  // keep one decimal max for non-integers
  const pretty = Number.isInteger(unit) ? String(unit) : (Math.round(unit * 10) / 10).toString();
  if (pack.kind === "liter") return `≈ ${pretty} ₪ לליטר`;
  return `≈ ${pretty} ₪ ליחידה`;
}

export function priceLinesForProduct(sku: string, name?: string) {
  const main =
    catalogPrice(sku) == null ? "צור קשר להצעת מחיר" : formatCatalogPrice(catalogPrice(sku)!);
  const unit = packUnitPriceLabel(sku, name);
  return { main, unit };
}
