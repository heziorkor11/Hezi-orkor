import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { adminDataRepo, adminMode, ephemeralDir } from "./config";
import { githubRepoIsPrivate } from "./git-catalog.server";
import type { StoredOrder } from "./types";
import { randomId } from "./tokens";

const FILE = "private-orders.json";

type OrdersFile = { version: 1; orders: StoredOrder[] };

function demoOrders(): StoredOrder[] {
  const mark = " (דוגמה)";
  return [
    {
      id: "HZ-ORD-20261113-1805",
      createdAt: "2026-11-13T15:12:00.000Z",
      status: "new",
      customer: { name: "רותם אבני" + mark, phone: "050-0000001", plate: "12-345-67", city: "נהריה" },
      delivery: "pickup",
      lines: [
        { sku: "HZ-CAF-00195", name: "פילטר מזגן סינ סרס 3 מ22", qty: 2, unitPrice: 11, lineTotal: 22 },
        { sku: "HZ-BRK-00070", name: "צלחת בלם", qty: 1, unitPrice: 309, lineTotal: 309 },
      ],
      subtotal: 331,
      shipping: 0,
      total: 331,
      source: "whatsapp-cart",
    },
    {
      id: "HZ-ORD-20261113-1748",
      createdAt: "2026-11-13T14:48:00.000Z",
      status: "new",
      customer: { name: "איתי בר-לב" + mark, phone: "050-0000002", city: "עכו" },
      delivery: "delivery",
      lines: [{ sku: "HZ-BRK-00001", name: "צלחת בלם אופל אינסיגניה", qty: 1, unitPrice: 576, lineTotal: 576 }],
      subtotal: 576,
      shipping: 0,
      total: 576,
      source: "whatsapp-cart",
    },
    {
      id: "HZ-ORD-20261113-1525",
      createdAt: "2026-11-13T13:25:00.000Z",
      status: "checking",
      customer: { name: "מיכל שדה" + mark, phone: "050-0000003", city: "נהריה" },
      delivery: "pickup",
      lines: [{ sku: "HZ-OIL-00010", name: "שמן מנוע (דוגמה)", qty: 1, unitPrice: 679, lineTotal: 679 }],
      subtotal: 679,
      shipping: 0,
      total: 679,
      source: "whatsapp-cart",
    },
  ];
}



async function filePath() {
  const dir = join(ephemeralDir(), "private");
  await mkdir(dir, { recursive: true });
  return join(dir, FILE);
}

export async function ordersPersistence(): Promise<{
  durable: boolean;
  reason: string;
}> {
  const dataRepo = adminDataRepo();
  if (dataRepo) {
    const priv = await githubRepoIsPrivate(dataRepo);
    if (priv === true) return { durable: true, reason: "private-data-repo" };
    return {
      durable: false,
      reason: "המאגר שצוין ב-ADMIN_DATA_GITHUB_REPO חסר או שאינו פרטי — הזמנות לא יישמרו שם.",
    };
  }
  return {
    durable: false,
    reason:
      "הריפו של האתר ציבורי, לכן הזמנות (פרטי לקוח) נשמרות רק באחסון זמני של המופע עד שיחובר מאגר פרטי",
  };
}

async function readAll(): Promise<StoredOrder[]> {
  try {
    const raw = await readFile(await filePath(), "utf8");
    const data = JSON.parse(raw) as OrdersFile;
    if (Array.isArray(data.orders) && data.orders.length) return data.orders;
  } catch {
    /* empty */
  }
  const mode = adminMode();
  if (mode === "preview-demo" || mode === "local") {
    const demo = demoOrders();
    await writeFile(await filePath(), `${JSON.stringify({ version: 1, orders: demo }, null, 2)}\n`, "utf8");
    return demo;
  }
  return [];
}

async function writeAll(orders: StoredOrder[]) {
  await writeFile(await filePath(), `${JSON.stringify({ version: 1, orders }, null, 2)}\n`, "utf8");
  const dataRepo = adminDataRepo();
  if (!dataRepo) return;
  const priv = await githubRepoIsPrivate(dataRepo);
  if (priv !== true) return;
  const { commitPrivateOrders } = await import("./git-private.server");
  await commitPrivateOrders(`${JSON.stringify({ version: 1, orders }, null, 2)}\n`);
}

export async function listOrders(): Promise<StoredOrder[]> {
  const orders = await readAll();
  return orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getOrder(id: string): Promise<StoredOrder | null> {
  return (await readAll()).find((o) => o.id === id) || null;
}

export async function saveOrder(order: StoredOrder) {
  const orders = await readAll();
  const i = orders.findIndex((o) => o.id === order.id);
  if (i >= 0) orders[i] = order;
  else orders.unshift(order);
  await writeAll(orders.slice(0, 500));
  return order;
}

export async function ingestCartOrder(input: Omit<StoredOrder, "id" | "createdAt" | "status"> & { id?: string }) {
  const id = input.id?.trim() || randomId("HZ-ORD");
  const existing = await getOrder(id);
  if (existing) return existing;
  const order: StoredOrder = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
    status: "new",
  };
  return saveOrder(order);
}

export const nextStatus: Record<StoredOrder["status"], StoredOrder["status"] | null> = {
  new: "checking",
  checking: "preparing",
  preparing: "shipped",
  shipped: "done",
  done: null,
};
