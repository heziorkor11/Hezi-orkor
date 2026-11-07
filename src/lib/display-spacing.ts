/** Presentation only: preserve every non-whitespace character and all fitment data. */
export function displaySpacing(sku: string, text: string) {
  if (!["HZ-GEN-00005", "HZ-GEN-01392"].includes(sku)) return text;
  return text
    .replace(/(אדום)(?=\d+\s*ליטר)/g, "$1 ")
    .replace(/(קדמי|אחורי)([LR])(?=\s|$)/g, "$1 $2")
    .replace(/(^|\s)(מ|עד)(?=\d{2}(?:\s|$|[.,]))/g, "$1$2 ");
}
