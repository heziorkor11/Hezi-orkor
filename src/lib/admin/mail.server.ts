import { connect } from "node:tls";
import { issueRevertToken } from "./tokens";
import { publicSiteOrigin } from "./config";
import type { ActivityEntry } from "./types";

function smtpConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.ADMIN_NOTIFY_EMAIL);
}

function sendSmtp(opts: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const user = process.env.GMAIL_USER!;
  const pass = process.env.GMAIL_APP_PASSWORD!;
  return new Promise((resolve, reject) => {
    const socket = connect({ host: "smtp.gmail.com", port: 465 }, () => {
      let buf = "";
      const lines = [
        `EHLO hezi-orkor`,
        `AUTH LOGIN`,
        Buffer.from(user).toString("base64"),
        Buffer.from(pass).toString("base64"),
        `MAIL FROM:<${user}>`,
        `RCPT TO:<${opts.to}>`,
        `DATA`,
      ];
      let step = 0;
      const from = `From: חזי אורקור ניהול <${user}>\r\n`;
      const payload =
        from +
        `To: ${opts.to}\r\n` +
        `Subject: =?UTF-8?B?${Buffer.from(opts.subject).toString("base64")}?=\r\n` +
        `MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n` +
        opts.html +
        `\r\n.\r\n`;
      socket.on("data", (chunk) => {
        buf += chunk.toString("utf8");
        if (!buf.includes("\n")) return;
        if (step < lines.length) {
          socket.write(`${lines[step++]}\r\n`);
          buf = "";
          return;
        }
        if (step === lines.length) {
          socket.write(payload);
          step++;
          buf = "";
          return;
        }
        socket.write("QUIT\r\n");
        socket.end();
        resolve();
      });
    });
    socket.setTimeout(15000, () => {
      socket.destroy();
      reject(new Error("SMTP timeout"));
    });
    socket.on("error", reject);
  });
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

export async function notifyMasterChange(entry: ActivityEntry): Promise<{ sent: boolean; reason?: string }> {
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
    await sendSmtp({
      to: process.env.ADMIN_NOTIFY_EMAIL!,
      subject: `שינוי עלה לאתר — ${entry.target}`,
      html,
      text: `${entry.action} ${entry.target} ${before} → ${after}\n${revertUrl}`,
    });
    return { sent: true };
  } catch (err) {
    console.warn("[admin] mail failed", err instanceof Error ? err.message : err);
    return { sent: false, reason: "smtp-failed" };
  }
}
