import type { BulkRule } from "./admin/types";
export type BulkLine = { sku: string; category: string; qty: number };
export function bulkRuleFor(sku: string, category: string, rules: BulkRule[]) {
  if (category !== "workshop-packs") return undefined;
  return (
    rules.find((r) => r.enabled && r.targetType === "product" && r.target === sku) ||
    rules.find((r) => r.enabled && r.targetType === "category" && r.target === category)
  );
}
/** SKU-specific rule wins; no stacking with promotions (caller supplies regular price).
 * Cross-SKU count includes only eligible category lines without their own rule. */
export function bulkPrice(
  sku: string,
  category: string,
  qty: number,
  regular: number | null,
  current: number | null,
  rules: BulkRule[],
  lines: BulkLine[] = [],
) {
  const rule = bulkRuleFor(sku, category, rules);
  if (!rule || !rule.public)
    return {
      price: rule && !rule.public ? null : current,
      percent: 0,
      quoteOnly: Boolean(rule && !rule.public),
    };
  const count = rule.aggregate
    ? lines
        .filter((l) => bulkRuleFor(l.sku, l.category, rules)?.id === rule.id)
        .reduce((n, l) => n + l.qty, 0)
    : qty;
  const tier = [...rule.tiers]
    .sort((a, b) => b.minPacks - a.minPacks)
    .find((t) => count >= t.minPacks);
  if (regular == null || current == null || !tier)
    return { price: current, percent: 0, quoteOnly: false };
  const reduced = Math.round(regular * (1 - tier.percent / 100) * 100) / 100;
  return {
    price: Math.min(current, reduced),
    percent: reduced < current ? tier.percent : 0,
    quoteOnly: false,
  };
}
