import type { StoredOrder } from "./types.ts";
import { isTestOrder } from "./test-order.ts";

const WEEKDAY_SHORT: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function jerusalemYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function jerusalemWeekday(d: Date): number {
  const short = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", weekday: "short" }).format(d);
  return WEEKDAY_SHORT[short] ?? 0;
}

/** Most recent `n` calendar days in Asia/Jerusalem, today first. */
export function lastNJerusalemDays(n: number, now = new Date()): string[] {
  const days: string[] = [];
  const seen = new Set<string>();
  let t = now.getTime();
  while (days.length < n) {
    const ymd = jerusalemYmd(new Date(t));
    if (!seen.has(ymd)) {
      seen.add(ymd);
      days.push(ymd);
    }
    t -= 60 * 60 * 1000;
    if (now.getTime() - t > 40 * 24 * 60 * 60 * 1000) break;
  }
  return days;
}

export function nextJerusalemDay(ymd: string): string {
  let t = endOfJerusalemDay(ymd).getTime() + 12 * 60 * 60 * 1000;
  for (let i = 0; i < 24; i++) {
    const next = jerusalemYmd(new Date(t));
    if (next !== ymd) return next;
    t += 60 * 60 * 1000;
  }
  return jerusalemYmd(new Date(endOfJerusalemDay(ymd).getTime() + 24 * 60 * 60 * 1000));
}

/** Sunday–Saturday week that contains `now` in Asia/Jerusalem, Sunday first. */
export function calendarWeekYmds(now = new Date()): string[] {
  const wd = jerusalemWeekday(now);
  const fromSun = lastNJerusalemDays(wd + 1, now).reverse();
  const days = fromSun.length ? [...fromSun] : [jerusalemYmd(now)];
  while (days.length < 7) days.push(nextJerusalemDay(days[days.length - 1]!));
  return days;
}

/** The complete Sunday–Saturday week before the one that contains `now`. */
export function previousCompleteWeekYmds(now = new Date()): string[] {
  const thisWeek = calendarWeekYmds(now);
  const sunday = thisWeek[0];
  if (!sunday) return [];
  // End of the day before this week's Sunday is Saturday of the previous week.
  const prevSat = previousJerusalemDay(sunday);
  return lastNJerusalemDays(7, endOfJerusalemDay(prevSat)).reverse();
}

export function previousJerusalemDay(ymd: string): string {
  const end = endOfJerusalemDay(ymd);
  return jerusalemYmd(new Date(end.getTime() - 24 * 60 * 60 * 1000));
}

/** A UTC instant that still falls on `ymd` in Asia/Jerusalem, late in that day. */
export function endOfJerusalemDay(ymd: string): Date {
  // 21:00 UTC is 23:00 IST / 00:00 IDT next day — too late in summer.
  // 19:00 UTC is 21:00 IST / 22:00 IDT, always still that calendar evening.
  return new Date(`${ymd}T19:00:00.000Z`);
}

export function formatYmdHe(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${Number(d)}.${Number(m)}.${y}`;
}

export function formatRangeHe(ymds: string[]): string {
  const days = [...ymds].sort();
  if (!days.length) return "";
  if (days.length === 1) return formatYmdHe(days[0]!);
  return `${formatYmdHe(days[0]!)} עד ${formatYmdHe(days[days.length - 1]!)}`;
}

export type SummaryProduct = { sku: string; name: string; qty: number; revenue: number };
export type SummaryDay = { ymd: string; label: string; count: number; revenue: number };

export type OrderSummary = {
  ymds: string[];
  labelHe: string;
  orderCount: number;
  revenue: number;
  itemCount: number;
  topProducts: SummaryProduct[];
  byDay: SummaryDay[];
};

export function realOrders(orders: StoredOrder[]): StoredOrder[] {
  return orders.filter((o) => !isTestOrder(o));
}

export function summarizeOrders(orders: StoredOrder[], ymds: string[]): OrderSummary {
  const want = new Set(ymds);
  const inRange = realOrders(orders).filter((o) => want.has(jerusalemYmd(new Date(o.createdAt))));
  const bySku = new Map<string, SummaryProduct>();
  const byDayMap = new Map<string, SummaryDay>();
  for (const y of [...ymds].sort()) {
    byDayMap.set(y, { ymd: y, label: formatYmdHe(y), count: 0, revenue: 0 });
  }
  let revenue = 0;
  let itemCount = 0;
  for (const order of inRange) {
    revenue += Number(order.total) || 0;
    const day = jerusalemYmd(new Date(order.createdAt));
    const bucket = byDayMap.get(day);
    if (bucket) {
      bucket.count += 1;
      bucket.revenue += Number(order.total) || 0;
    }
    for (const line of order.lines || []) {
      const qty = Math.max(0, Number(line.qty) || 0);
      itemCount += qty;
      const prev = bySku.get(line.sku) || { sku: line.sku, name: line.name, qty: 0, revenue: 0 };
      prev.qty += qty;
      prev.revenue += Number(line.lineTotal) || 0;
      if (!prev.name && line.name) prev.name = line.name;
      bySku.set(line.sku, prev);
    }
  }
  const topProducts = [...bySku.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 8);
  return {
    ymds: [...ymds].sort(),
    labelHe: formatRangeHe(ymds),
    orderCount: inRange.length,
    revenue,
    itemCount,
    topProducts,
    byDay: [...byDayMap.values()].sort((a, b) => a.ymd.localeCompare(b.ymd)),
  };
}

export function dailySummaryWindow(now = new Date()): string[] {
  return [jerusalemYmd(now)];
}

/** Previous complete Sunday–Saturday, for the Sunday-morning weekly email. */
export function weeklySummaryWindow(now = new Date()): string[] {
  return previousCompleteWeekYmds(now);
}
