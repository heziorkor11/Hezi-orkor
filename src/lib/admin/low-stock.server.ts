import { adminProductRow } from "./catalog-query.server";
import { getPublicOverlay } from "./public-overlay";
import { readNotificationSettings } from "./notification-settings.server";
import { isLowStock, parseStockQty, type LowStockItem } from "./stock-qty";

export type { LowStockItem };

export async function listLowStock(threshold?: number): Promise<LowStockItem[]> {
  const settings = await readNotificationSettings();
  const limit = threshold ?? settings.lowStockThreshold;
  const bySku = getPublicOverlay().stockBySku || {};
  const items: LowStockItem[] = [];
  for (const [sku, raw] of Object.entries(bySku)) {
    const qty = parseStockQty(raw);
    if (qty == null || !isLowStock(qty, limit)) continue;
    let name = sku;
    try {
      const row = await adminProductRow(sku);
      if (row?.name) name = row.name;
    } catch {
      /* keep sku */
    }
    items.push({ sku, name, qty, out: qty === 0 });
  }
  items.sort((a, b) => a.qty - b.qty || a.name.localeCompare(b.name, "he"));
  return items;
}

export async function crossedLowStock(opts: {
  sku: string;
  name: string;
  prev: string | undefined;
  next: string;
}): Promise<LowStockItem | null> {
  const settings = await readNotificationSettings();
  const prev = parseStockQty(opts.prev);
  const next = parseStockQty(opts.next);
  if (next == null) return null;
  if (!isLowStock(next, settings.lowStockThreshold)) return null;
  if (prev != null && isLowStock(prev, settings.lowStockThreshold)) return null;
  return { sku: opts.sku, name: opts.name, qty: next, out: next === 0 };
}
