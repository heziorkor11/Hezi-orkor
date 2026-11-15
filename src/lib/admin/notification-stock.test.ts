import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allowCustomerOrderEmail,
  isValidEmail,
  mailSubjectPrefix,
  normalizeExtraAddresses,
  normalizeNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from "./notification-settings.ts";
import { isLowStock, isOutOfStock, normalizeStockInput, parseStockQty } from "./stock-qty.ts";
import { isTestOrder } from "./test-order.ts";
import {
  calendarWeekYmds,
  dailySummaryWindow,
  formatRangeHe,
  jerusalemYmd,
  previousCompleteWeekYmds,
  realOrders,
  summarizeOrders,
  weeklySummaryWindow,
} from "./summary.ts";
import { buildMimeMessage, sanitizeAttachmentFilename } from "./smtp.ts";
import { authorizeCronRequest, cronSecretConfigured } from "./cron-auth.ts";
import type { StoredOrder } from "./types.ts";

test("stock qty parses integers and treats empty as unmanaged", () => {
  assert.equal(parseStockQty(""), null);
  assert.equal(parseStockQty("  "), null);
  assert.equal(parseStockQty("8"), 8);
  assert.equal(parseStockQty(0), 0);
  assert.equal(parseStockQty("8 יח׳"), null);
  assert.equal(parseStockQty("-1"), null);
  assert.equal(parseStockQty("1.5"), null);
  assert.equal(isOutOfStock("0"), true);
  assert.equal(isOutOfStock(""), false);
  assert.equal(isOutOfStock("2"), false);
  assert.equal(isLowStock("2", 3), true);
  assert.equal(isLowStock("4", 3), false);
  assert.equal(isLowStock("", 3), false);
  assert.deepEqual(normalizeStockInput(""), { ok: true, value: "" });
  assert.deepEqual(normalizeStockInput(" 3 "), { ok: true, value: "3" });
  assert.deepEqual(normalizeStockInput(0), { ok: true, value: "0" });
  assert.equal(normalizeStockInput("nope").ok, false);
  assert.equal(normalizeStockInput(-2).ok, false);
});

test("email validation and extra address normalization", () => {
  assert.equal(isValidEmail("a@b.co"), true);
  assert.equal(isValidEmail("A@B.CO"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail(""), false);
  assert.deepEqual(normalizeExtraAddresses([" Office@X.com ", "office@x.com", "bad", "also@ok.co.il"]), [
    "office@x.com",
    "also@ok.co.il",
  ]);
  const s = normalizeNotificationSettings({
    extraAddresses: ["one@x.com", "bad"],
    enabled: { orderCustomer: false },
    lowStockThreshold: 5,
  });
  assert.equal(s.version, 1);
  assert.equal(s.enabled.orderCustomer, false);
  assert.equal(s.enabled.orderMaster, true);
  assert.equal(s.lowStockThreshold, 5);
  assert.deepEqual(s.extraAddresses, ["one@x.com"]);
  assert.equal(DEFAULT_NOTIFICATION_SETTINGS.lowStockThreshold, 3);
});

test("preview never allows customer order email; production does", () => {
  const prev = process.env.VERCEL_ENV;
  delete process.env.VERCEL_ENV;
  assert.equal(allowCustomerOrderEmail(), false);
  assert.equal(mailSubjectPrefix(), "[תצוגה] ");
  process.env.VERCEL_ENV = "preview";
  assert.equal(allowCustomerOrderEmail(), false);
  assert.equal(mailSubjectPrefix(), "[תצוגה] ");
  process.env.VERCEL_ENV = "production";
  assert.equal(allowCustomerOrderEmail(), true);
  assert.equal(mailSubjectPrefix(), "");
  if (prev === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = prev;
});

test("preview notification-settings path is isolated and rejects illegal overrides", async () => {
  const { privateNotificationSettingsPath, PRIVATE_GIT_PATHS, assertPrivateGitPath } = await import("./git-private.server.ts");
  const prevEnv = process.env.VERCEL_ENV;
  const prevPath = process.env.ADMIN_DATA_NOTIFICATION_SETTINGS_PATH;
  delete process.env.ADMIN_DATA_NOTIFICATION_SETTINGS_PATH;
  process.env.VERCEL_ENV = "production";
  assert.equal(privateNotificationSettingsPath(), "admin/notification-settings.json");
  delete process.env.VERCEL_ENV;
  assert.equal(privateNotificationSettingsPath(), "admin/preview/notification-settings.json");
  process.env.VERCEL_ENV = "preview";
  assert.equal(privateNotificationSettingsPath(), "admin/preview/notification-settings.json");
  process.env.ADMIN_DATA_NOTIFICATION_SETTINGS_PATH = "admin/preview/notification-settings.json";
  assert.equal(privateNotificationSettingsPath(), "admin/preview/notification-settings.json");
  process.env.ADMIN_DATA_NOTIFICATION_SETTINGS_PATH = "orders/orders.json";
  assert.throws(() => privateNotificationSettingsPath(), /notification-settings/);
  process.env.ADMIN_DATA_NOTIFICATION_SETTINGS_PATH = "../secret.json";
  assert.throws(() => privateNotificationSettingsPath(), /allowlisted/);
  assert.ok((PRIVATE_GIT_PATHS as readonly string[]).includes("admin/notification-settings.json"));
  assert.ok((PRIVATE_GIT_PATHS as readonly string[]).includes("admin/preview/notification-settings.json"));
  assert.throws(() => assertPrivateGitPath("admin/notification-settings.json.bak"), /allowlisted/);
  if (prevEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = prevEnv;
  if (prevPath === undefined) delete process.env.ADMIN_DATA_NOTIFICATION_SETTINGS_PATH;
  else process.env.ADMIN_DATA_NOTIFICATION_SETTINGS_PATH = prevPath;
});

function order(partial: Partial<StoredOrder> & { id: string; createdAt: string; name: string; total: number; lines?: StoredOrder["lines"] }): StoredOrder {
  return {
    id: partial.id,
    createdAt: partial.createdAt,
    status: partial.status || "done",
    customer: { name: partial.name, phone: "0500000000" },
    delivery: "pickup",
    lines: partial.lines || [{ sku: "HZ-A", name: "פריט", qty: 1, unitPrice: partial.total, lineTotal: partial.total }],
    subtotal: partial.total,
    shipping: 0,
    total: partial.total,
    source: "whatsapp-cart",
  };
}

test("summary hides test orders and aggregates by Jerusalem day", () => {
  const real = order({
    id: "HZ-ORD-20261114-1000",
    createdAt: "2026-11-14T10:00:00.000Z", // 12:00 IST
    name: "רותם אבני",
    total: 200,
    lines: [
      { sku: "HZ-CAF-00195", name: "פילטר", qty: 2, unitPrice: 50, lineTotal: 100 },
      { sku: "HZ-BRK-00001", name: "צלחת", qty: 1, unitPrice: 100, lineTotal: 100 },
    ],
  });
  const demo = order({
    id: "HZ-ORD-20261114-1100",
    createdAt: "2026-11-14T11:00:00.000Z",
    name: "בדיקה (דוגמה)",
    total: 999,
  });
  const e2e = order({
    id: "HZ-ORD-TEST-E2E-20261114",
    createdAt: "2026-11-14T12:00:00.000Z",
    name: "E2E",
    total: 1,
  });
  assert.equal(isTestOrder(demo), true);
  assert.equal(isTestOrder(e2e), true);
  assert.equal(isTestOrder(real), false);
  assert.equal(realOrders([real, demo, e2e]).length, 1);
  const ymd = jerusalemYmd(new Date("2026-11-14T10:00:00.000Z"));
  const sum = summarizeOrders([real, demo, e2e], [ymd]);
  assert.equal(sum.orderCount, 1);
  assert.equal(sum.revenue, 200);
  assert.equal(sum.itemCount, 3);
  assert.equal(sum.topProducts[0]?.sku, "HZ-CAF-00195");
  assert.equal(sum.topProducts[0]?.qty, 2);
  assert.match(formatRangeHe(["2026-11-08", "2026-11-14"]), /8.*עד.*14/);
});

test("calendar week is Sunday to Saturday in Asia/Jerusalem", () => {
  // Wednesday 11 Nov 2026 12:00 IST = 10:00 UTC
  const wed = new Date("2026-11-11T10:00:00.000Z");
  const week = calendarWeekYmds(wed);
  assert.deepEqual(week, [
    "2026-11-08",
    "2026-11-09",
    "2026-11-10",
    "2026-11-11",
    "2026-11-12",
    "2026-11-13",
    "2026-11-14",
  ]);
  const prev = previousCompleteWeekYmds(wed);
  assert.equal(prev[0], "2026-11-01");
  assert.equal(prev[6], "2026-11-07");
  // Sunday morning weekly window is the previous complete week
  const sundayMorning = new Date("2026-11-15T06:00:00.000Z");
  const sunWeek = weeklySummaryWindow(sundayMorning);
  assert.equal(sunWeek[0], "2026-11-08");
  assert.equal(sunWeek[6], "2026-11-14");
  assert.deepEqual(dailySummaryWindow(wed), ["2026-11-11"]);
});

test("MIME message attaches a PDF and does not leak secrets", () => {
  const pdf = Buffer.from("%PDF-1.4 test pdf bytes");
  const msg = buildMimeMessage(
    {
      to: "customer@example.com",
      subject: "אישור הזמנה HZ-ORD-1",
      html: "<p>שלום</p>",
      text: "שלום",
      attachments: [{ filename: "HZ-ORD-1.pdf", contentType: "application/pdf", bytes: pdf }],
    },
    "shop@example.com",
  );
  assert.match(msg, /Content-Disposition: attachment; filename="HZ-ORD-1.pdf"/);
  assert.match(msg, /Content-Type: application\/pdf/);
  assert.match(msg, /Content-Transfer-Encoding: base64/);
  assert.ok(msg.includes(pdf.toString("base64").slice(0, 20)));
  assert.ok(msg.trim().endsWith("."));
  assert.equal(msg.includes("GMAIL_APP_PASSWORD"), false);
  assert.equal(sanitizeAttachmentFilename("../../etc/passwd.pdf"), "passwd.pdf");
});

test("cron auth fails closed without secret and accepts only the bearer token", () => {
  const prev = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  assert.equal(cronSecretConfigured(), false);
  assert.equal(authorizeCronRequest(new Request("https://x.test/api/admin/cron/daily-summary")), false);
  process.env.CRON_SECRET = "cron-test-secret";
  assert.equal(cronSecretConfigured(), true);
  assert.equal(
    authorizeCronRequest(
      new Request("https://x.test/cron", { headers: { authorization: "Bearer cron-test-secret" } }),
    ),
    true,
  );
  assert.equal(
    authorizeCronRequest(
      new Request("https://x.test/cron", { headers: { authorization: "Bearer other-secret-value" } }),
    ),
    false,
  );
  if (prev === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = prev;
});
