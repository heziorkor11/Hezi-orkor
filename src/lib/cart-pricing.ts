/** Uses the existing price resolver verbatim; no VAT addition or fallback price. Totals are the sum of catalogPrice (already ceiled) × qty. */
export function summarizeCart(
  lines: { sku: string; qty: number }[],
  priceForSku: (sku: string) => number | null,
) {
  let subtotal = 0;
  let quoteCount = 0;
  const bySku: Record<string, { unitPrice: number | null; lineTotal: number | null }> = {};
  for (const line of lines) {
    const unitPrice = priceForSku(line.sku);
    const lineTotal = unitPrice == null ? null : unitPrice * line.qty;
    if (lineTotal == null) quoteCount++;
    else subtotal += lineTotal;
    bySku[line.sku] = { unitPrice, lineTotal };
  }
  return { subtotal, quoteCount, bySku };
}
