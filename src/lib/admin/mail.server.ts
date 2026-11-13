import { issueRevertToken } from "./tokens";
import { publicSiteOrigin } from "./config";
import { sendSmtp, type SmtpTransport } from "./smtp";
import type { ActivityEntry } from "./types";

function smtpConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.ADMIN_NOTIFY_EMAIL);
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

export async function notifyMasterChange(entry: ActivityEntry): Promise<{ sent: boolean; reason?: string; transport?: SmtpTransport }> {
  if (!smtpConfigured()) return { sent: false, reason: "smtp-not-configured" };
  const origin = publicSiteOrigin();
  const token = issueRevertToken(entry.id);
  const revertUrl = `${origin}/admin/revert?token=${encodeURIComponent(token)}`;
  const before = JSON.stringify(entry.before);
  const after = JSON.stringify(entry.after);
  const html = `
  <div dir="rtl" style="font-family:Heebo,Arial,sans-serif;max-width:640px;margin:0 auto">
    <h2>שינוי של עובד עלה לאתר</h2>
    <p>השינוי כבר מוצג בחנות. אם הוא שגוי — לחצו «בטל» כדי להחזיר את המוצר למצב הקודם.</p>
    <p><b>מי:</b> ${esc(entry.actorName)} (${esc(entry.actorRole)})<br>
    <b>מה:</b> ${esc(entry.action)}<br>
    <b>יעד:</b> ${esc(entry.target)}<br>
    <b>מתי:</b> ${esc(new Date(entry.at).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }))}</p>
    <p><s>${esc(before)}</s> → <b>${esc(after)}</b></p>
    <p><a href="${esc(revertUrl)}" style="display:inline-block;background:#fff;color:#e23b12;border:1px solid #e23b12;padding:10px 16px;border-radius:12px;font-weight:700;text-decoration:none">בטל</a></p>
  </div>`;
  try {
    const { transport } = await sendSmtp({
      to: process.env.ADMIN_NOTIFY_EMAIL!,
      subject: `שינוי עלה לאתר — ${entry.target}`,
      html,
      text: `${entry.action} ${entry.target} ${before} → ${after}\n${revertUrl}`,
    });
    return { sent: true, transport };
  } catch (err) {
    console.warn("[admin] mail failed", err instanceof Error ? err.message : err);
    return { sent: false, reason: "smtp-failed" };
  }
}

export { sendSmtp, SmtpError, isSmtpConnectOrTlsFailure, SMTP_TRANSPORTS, SMTP_HOST } from "./smtp";
export type { SmtpTransport, SmtpSendDeps } from "./smtp";
