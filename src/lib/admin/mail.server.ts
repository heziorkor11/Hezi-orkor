import { issueRevertToken } from "./tokens";
import { publicSiteOrigin } from "./config";
import { sendSmtp, type SmtpTransport } from "./smtp";
import type { ActivityEntry } from "./types";
import {
  buildChangeNotification,
  notifyEmail,
  SAMPLE_REVERT_PATH,
  smtpConfigured,
  smtpErrorMessageHe,
} from "./mail-template";

export {
  buildChangeNotification,
  notifyEmail,
  SAMPLE_REVERT_PATH,
  smtpConfigured,
  smtpErrorMessageHe,
};
export type { ChangeMailInput } from "./mail-template";

export async function notifyMasterChange(entry: ActivityEntry): Promise<{ sent: boolean; reason?: string; message?: string; transport?: SmtpTransport }> {
  if (!smtpConfigured()) return { sent: false, reason: "smtp-not-configured", message: smtpErrorMessageHe("smtp-not-configured") };
  const origin = publicSiteOrigin();
  const token = issueRevertToken(entry.id);
  const revertUrl = `${origin}/admin/revert?token=${encodeURIComponent(token)}`;
  const mail = buildChangeNotification({
    actorName: entry.actorName,
    actorRole: entry.actorRole,
    action: entry.action,
    target: entry.target,
    at: entry.at,
    before: entry.before,
    after: entry.after,
    revertUrl,
  });
  try {
    const { transport } = await sendSmtp({
      to: process.env.ADMIN_NOTIFY_EMAIL!,
      ...mail,
    });
    return { sent: true, transport };
  } catch (err) {
    console.warn("[admin] mail failed", err instanceof Error ? err.message : err);
    return { sent: false, reason: "smtp-failed", message: smtpErrorMessageHe("smtp-failed", err) };
  }
}

export async function sendTestNotification(): Promise<{
  sent: boolean;
  reason?: string;
  message: string;
  transport?: SmtpTransport;
  to?: string;
}> {
  if (!smtpConfigured()) {
    return { sent: false, reason: "smtp-not-configured", message: smtpErrorMessageHe("smtp-not-configured") };
  }
  const to = notifyEmail();
  const revertUrl = `${publicSiteOrigin()}${SAMPLE_REVERT_PATH}`;
  const mail = buildChangeNotification({
    actorName: "יואב לוי",
    actorRole: "עובד",
    action: "עריכת מוצר (price) — דוגמת בדיקה",
    target: "HZ-CAF-00195",
    at: new Date().toISOString(),
    before: { price: 11 },
    after: { price: 13 },
    revertUrl,
    sample: true,
  });
  try {
    const { transport } = await sendSmtp({ to, ...mail });
    return {
      sent: true,
      transport,
      to,
      message: `נשלח מייל בדיקה אל ${to}. קישור «בטל» בדוגמה אינו מבטל שינוי אמיתי.`,
    };
  } catch (err) {
    console.warn("[admin] test mail failed", err instanceof Error ? err.message : err);
    return { sent: false, reason: "smtp-failed", message: smtpErrorMessageHe("smtp-failed", err) };
  }
}

export { sendSmtp, SmtpError, isSmtpConnectOrTlsFailure, SMTP_TRANSPORTS, SMTP_HOST } from "./smtp";
export type { SmtpTransport, SmtpSendDeps } from "./smtp";
