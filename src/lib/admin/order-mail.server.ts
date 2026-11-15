import { sendSmtp, type MailAttachment } from "./smtp";
import { smtpConfigured, smtpErrorMessageHe, notifyEmail } from "./mail-template";
import { publicSiteOrigin } from "./config";
import { getOrder, saveOrder, listOrders } from "./orders.server";
import { readOrderPdf } from "./order-pdf-store.server";
import { readNotificationSettings } from "./notification-settings.server";
import {
  allowCustomerOrderEmail,
  isValidEmail,
  type NotificationMailType,
} from "./notification-settings";
import {
  buildCustomerOrderMail,
  buildLowStockMail,
  buildNewOrderMasterMail,
  buildSummaryMail,
} from "./order-mail";
import { isTestOrder } from "./test-order";
import type { StoredOrder } from "./types";
import {
  summarizeOrders,
  dailySummaryWindow,
  weeklySummaryWindow,
  calendarWeekYmds,
  type OrderSummary,
} from "./summary";

async function sendOne(to: string, subject: string, html: string, text: string, attachments?: MailAttachment[]): Promise<{ sent: boolean; reason?: string; message?: string }> {
  if (!smtpConfigured()) return { sent: false, reason: "smtp-not-configured", message: smtpErrorMessageHe("smtp-not-configured") };
  if (!isValidEmail(to)) return { sent: false, reason: "bad-address", message: "כתובת דוא״ל לא תקינה" };
  try {
    await sendSmtp({ to, subject, html, text, attachments });
    return { sent: true };
  } catch (err) {
    console.warn("[admin] mail failed", err instanceof Error ? err.message : err);
    return { sent: false, reason: "smtp-failed", message: smtpErrorMessageHe("smtp-failed", err) };
  }
}

async function officeRecipients(type: NotificationMailType): Promise<string[]> {
  const settings = await readNotificationSettings();
  const out: string[] = [];
  const master = notifyEmail();
  if (type === "orderMaster" || type === "dailySummary" || type === "weeklySummary" || type === "lowStock") {
    if (settings.enabled[type] && isValidEmail(master)) out.push(master.toLowerCase());
  }
  if (type === "orderExtra" || type === "dailySummary" || type === "weeklySummary" || type === "lowStock") {
    const enabled = type === "orderExtra" ? settings.enabled.orderExtra : settings.enabled[type];
    if (enabled) {
      for (const addr of settings.extraAddresses) {
        if (isValidEmail(addr) && !out.includes(addr)) out.push(addr);
      }
    }
  }
  return out;
}

export async function notifyNewOrder(order: StoredOrder): Promise<void> {
  if (isTestOrder(order)) return;
  if (order.mail?.masterSentAt) return;
  const mail = buildNewOrderMasterMail(order, `${publicSiteOrigin()}/admin/orders/${encodeURIComponent(order.id)}`);
  const recipients = new Set<string>([
    ...(await officeRecipients("orderMaster")),
    ...(await officeRecipients("orderExtra")),
  ]);
  let any = false;
  for (const to of recipients) {
    const res = await sendOne(to, mail.subject, mail.html, mail.text);
    if (res.sent) any = true;
  }
  if (any) {
    const live = (await getOrder(order.id)) || order;
    live.mail = { ...live.mail, masterSentAt: new Date().toISOString() };
    await saveOrder(live);
  }
}

export async function notifyCustomerOrder(orderId: string): Promise<{ sent: boolean; reason?: string }> {
  const order = await getOrder(orderId);
  if (!order) return { sent: false, reason: "missing-order" };
  if (isTestOrder(order)) return { sent: false, reason: "test-order" };
  if (order.mail?.customerSentAt) return { sent: false, reason: "already-sent" };
  const email = (order.customer.email || "").trim();
  if (!email || !isValidEmail(email)) return { sent: false, reason: "no-customer-email" };
  if (!allowCustomerOrderEmail()) return { sent: false, reason: "preview-gated" };
  const settings = await readNotificationSettings();
  if (!settings.enabled.orderCustomer) return { sent: false, reason: "disabled" };
  const pdf = await readOrderPdf(orderId);
  const attachments: MailAttachment[] | undefined = pdf
    ? [{ filename: `${order.id}.pdf`, contentType: "application/pdf", bytes: pdf }]
    : undefined;
  const mail = buildCustomerOrderMail(order);
  const res = await sendOne(email, mail.subject, mail.html, mail.text, attachments);
  if (res.sent) {
    const live = (await getOrder(orderId)) || order;
    live.mail = { ...live.mail, customerSentAt: new Date().toISOString() };
    await saveOrder(live);
  }
  return res;
}

export async function notifyLowStockItems(items: { sku: string; name: string; qty: number }[]): Promise<void> {
  if (!items.length) return;
  const settings = await readNotificationSettings();
  if (!settings.enabled.lowStock) return;
  const mail = buildLowStockMail(items, settings.lowStockThreshold);
  const recipients = await officeRecipients("lowStock");
  for (const to of recipients) {
    await sendOne(to, mail.subject, mail.html, mail.text);
  }
}

export async function sendPeriodSummary(kind: "daily" | "weekly", now = new Date()): Promise<{ sent: boolean; reason?: string; summary: OrderSummary; recipients: number }> {
  const settings = await readNotificationSettings();
  const enabled = kind === "daily" ? settings.enabled.dailySummary : settings.enabled.weeklySummary;
  const ymds = kind === "daily" ? dailySummaryWindow(now) : weeklySummaryWindow(now);
  const orders = await listOrders();
  const summary = summarizeOrders(orders, ymds);
  if (!enabled) return { sent: false, reason: "disabled", summary, recipients: 0 };
  const recipients = await officeRecipients(kind === "daily" ? "dailySummary" : "weeklySummary");
  if (!recipients.length) return { sent: false, reason: "no-recipients", summary, recipients: 0 };
  const mail = buildSummaryMail(kind, summary.labelHe, {
    orderCount: summary.orderCount,
    revenue: summary.revenue,
    itemCount: summary.itemCount,
    topProducts: summary.topProducts,
    dashboardUrl: `${publicSiteOrigin()}/admin/summary`,
  });
  let sent = 0;
  for (const to of recipients) {
    const res = await sendOne(to, mail.subject, mail.html, mail.text);
    if (res.sent) sent += 1;
  }
  return { sent: sent > 0, reason: sent ? undefined : "smtp-failed", summary, recipients: sent };
}

export async function dashboardSummaries(now = new Date()) {
  const orders = await listOrders();
  return {
    daily: summarizeOrders(orders, dailySummaryWindow(now)),
    weekToDate: summarizeOrders(orders, calendarWeekYmds(now)),
    lastWeek: summarizeOrders(orders, weeklySummaryWindow(now)),
  };
}
