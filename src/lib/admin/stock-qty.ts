/** Numeric stock helpers. Empty / non-numeric means stock is unmanaged. */
export function parseStockQty(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") {
    if (!Number.isInteger(raw) || raw < 0) return null;
    return raw;
  }
  const t = String(raw).trim();
  if (!t) return null;
  const m = t.match(/^(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

export function isOutOfStock(raw: string | number | null | undefined): boolean {
  return parseStockQty(raw) === 0;
}

export function isLowStock(raw: string | number | null | undefined, threshold = 3): boolean {
  const n = parseStockQty(raw);
  return n != null && n <= threshold;
}

/** Accept a form/API value: empty clears management; otherwise a whole number ≥ 0. */
export function normalizeStockInput(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, value: "" };
  if (typeof raw === "number") {
    if (!Number.isInteger(raw) || raw < 0) {
      return { ok: false, error: "כמות מלאי חייבת להיות מספר שלם 0 ומעלה" };
    }
    return { ok: true, value: String(raw) };
  }
  if (typeof raw !== "string") return { ok: false, error: "כמות מלאי לא תקינה" };
  const t = raw.trim();
  if (!t) return { ok: true, value: "" };
  const n = parseStockQty(t);
  if (n == null) return { ok: false, error: "כמות מלאי חייבת להיות מספר שלם 0 ומעלה, או ריקה" };
  return { ok: true, value: String(n) };
}

export type LowStockItem = { sku: string; name: string; qty: number; out: boolean };
