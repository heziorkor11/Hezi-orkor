import type { StoredOrder } from "./types.ts";
import { mailSubjectPrefix } from "./notification-settings.ts";

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

export function formatIls(n: number): string {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n || 0);
}

function whenHe(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
}

function deliveryHe(d: StoredOrder["delivery"]): string {
  if (d === "pickup") return "איסוף עצמי מנהריה";
  if (d === "delivery") return "משלוח";
  return "לא צוין";
}

function wrap(body: string): string {
  return `<div dir="rtl" style="font-family:Heebo,Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;background:#f7f7f5;padding:16px">
  <div style="background:#fff;border:1px solid #e6e4de;border-radius:16px;padding:20px 18px">
    <p style="margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:.04em;color:#e23b12">חזי אורקור</p>
    ${body}
  </div>
  <p style="font-size:11px;color:#888;margin:12px 8px 0">הודעה זו נשלחה אוטומטית מאתר חזי אורקור. אין להשיב למייל זה.</p>
</div>`;
}

function linesTable(order: StoredOrder): string {
  const rows = (order.lines || [])
    .map((l) => {
      const total = l.lineTotal == null ? "להצעת מחיר" : formatIls(l.lineTotal);
      return `<tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee">${esc(l.name)}<br><span dir="ltr" style="font-size:11px;color:#888">${esc(l.sku)}</span></td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center">${l.qty} יח׳</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:left">${esc(total)}</td>
      </tr>`;
    })
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
    <p style="margin:12px 0 0;font-weight:800">סה״כ: ${esc(formatIls(order.total || 0))}</p>`;
}

export function buildNewOrderMasterMail(order: StoredOrder, orderUrl: string): { subject: string; html: string; text: string } {
  const c = order.customer;
  const subject = `${mailSubjectPrefix()}הזמנה חדשה ${order.id}`;
  const html = wrap(`
    <h2 style="margin:0 0 8px;font-size:20px">התקבלה הזמנה חדשה</h2>
    <p style="margin:0 0 12px">מספר הזמנה: <span dir="ltr">${esc(order.id)}</span><br>
    התקבלה: ${esc(whenHe(order.createdAt))}</p>
    <p style="margin:0 0 12px"><b>לקוח:</b> ${esc(c.name)}<br>
    <b>טלפון:</b> <span dir="ltr">${esc(c.phone || "—")}</span><br>
    ${c.email ? `<b>דוא״ל:</b> <span dir="ltr">${esc(c.email)}</span><br>` : ""}
    <b>עיר:</b> ${esc(c.city || "—")}<br>
    <b>משלוח/איסוף:</b> ${esc(deliveryHe(order.delivery))}</p>
    ${linesTable(order)}
    <p style="margin:16px 0 0"><a href="${esc(orderUrl)}" style="display:inline-block;background:#e23b12;color:#fff;padding:10px 16px;border-radius:12px;font-weight:700;text-decoration:none">פתח בלוח הניהול</a></p>
  `);
  const text = `הזמנה חדשה ${order.id}\n${c.name} · ${c.phone}\nסה״כ ${order.total}\n${orderUrl}`;
  return { subject, html, text };
}

export function buildCustomerOrderMail(order: StoredOrder): { subject: string; html: string; text: string } {
  const c = order.customer;
  const subject = `${mailSubjectPrefix()}אישור הזמנה ${order.id} — חזי אורקור`;
  const html = wrap(`
    <h2 style="margin:0 0 8px;font-size:20px">קיבלנו את ההזמנה</h2>
    <p style="margin:0 0 12px">שלום ${esc(c.name || "")}, תודה. ההזמנה נקלטה אצלנו. מצורף קובץ PDF עם הפרטים.</p>
    <p style="margin:0 0 12px">מספר הזמנה: <span dir="ltr">${esc(order.id)}</span><br>
    תאריך: ${esc(whenHe(order.createdAt))}<br>
    משלוח/איסוף: ${esc(deliveryHe(order.delivery))}</p>
    ${linesTable(order)}
    <p style="margin:16px 0 0;font-size:13px;color:#555">נחזור אליכם בוואטסאפ או בטלפון לאישור סופי. לשאלות: <span dir="ltr">04-9920111</span>.</p>
  `);
  const text = `קיבלנו את ההזמנה ${order.id}. מצורף PDF. סה״כ ${order.total || 0}.`;
  return { subject, html, text };
}

export function buildLowStockMail(items: { sku: string; name: string; qty: number }[], threshold: number): { subject: string; html: string; text: string } {
  const subject = `${mailSubjectPrefix()}מלאי נמוך — ${items.length} פריטים`;
  const rows = items
    .map((i) => `<li>${esc(i.name)} · <span dir="ltr">${esc(i.sku)}</span> · ${i.qty === 0 ? "אזל מהמלאי" : `${i.qty} יח׳`}</li>`)
    .join("");
  const html = wrap(`
    <h2 style="margin:0 0 8px;font-size:20px">התראת מלאי נמוך</h2>
    <p style="margin:0 0 12px">הכמות ירדה ל־${threshold} יח׳ או מתחת, או לאפס. המלאי משתנה רק ידנית.</p>
    <ul style="padding-right:18px;margin:0">${rows}</ul>
  `);
  const text = `מלאי נמוך (סף ${threshold}):\n` + items.map((i) => `${i.sku} ${i.name} — ${i.qty}`).join("\n");
  return { subject, html, text };
}

export function buildSummaryMail(kind: "daily" | "weekly", labelHe: string, summary: {
  orderCount: number;
  revenue: number;
  itemCount: number;
  topProducts: { sku: string; name: string; qty: number }[];
  dashboardUrl: string;
}): { subject: string; html: string; text: string } {
  const title = kind === "daily" ? "סיכום יומי" : "סיכום שבועי";
  const subject = `${mailSubjectPrefix()}${title} — ${labelHe}`;
  const top = summary.topProducts.length
    ? `<ol style="padding-right:18px">${summary.topProducts
        .map((p) => `<li>${esc(p.name)} · ${p.qty} יח׳ · <span dir="ltr">${esc(p.sku)}</span></li>`)
        .join("")}</ol>`
    : "<p>אין פריטים בטווח.</p>";
  const html = wrap(`
    <h2 style="margin:0 0 8px;font-size:20px">${title}</h2>
    <p style="margin:0 0 12px">טווח: ${esc(labelHe)} (שעון ישראל). הזמנות בדיקה מוסתרות.</p>
    <p style="margin:0 0 12px"><b>הזמנות:</b> ${summary.orderCount}<br>
    <b>פריטים:</b> ${summary.itemCount}<br>
    <b>מחזור:</b> ${esc(formatIls(summary.revenue))}</p>
    <p style="margin:0 0 6px;font-weight:800">המוצרים המובילים</p>
    ${top}
    <p style="margin:16px 0 0"><a href="${esc(summary.dashboardUrl)}" style="display:inline-block;background:#e23b12;color:#fff;padding:10px 16px;border-radius:12px;font-weight:700;text-decoration:none">פתח את מסך הסיכום</a></p>
  `);
  const text = `${title} ${labelHe}: ${summary.orderCount} הזמנות, ${formatIls(summary.revenue)}.`;
  return { subject, html, text };
}
