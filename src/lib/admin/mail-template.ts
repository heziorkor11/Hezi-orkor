export const SAMPLE_REVERT_PATH = "/admin/revert?sample=1";

export function smtpConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.ADMIN_NOTIFY_EMAIL);
}

export function notifyEmail() {
  return (process.env.ADMIN_NOTIFY_EMAIL || "").trim();
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function safeErrorSnippet(msg: string) {
  return msg
    .replace(/[A-Za-z0-9+/]{20,}={0,2}/g, "[הוסתר]")
    .replace(/\S+@\S+\.\S+/g, "[הוסתר]")
    .slice(0, 180);
}

export function smtpErrorMessageHe(reason?: string, err?: unknown): string {
  if (reason === "smtp-not-configured") {
    return "לא ניתן לשלוח: חסרות הגדרות Gmail בשרת (משתמש, סיסמת אפליקציה, או כתובת ייעוד).";
  }
  const msg = err instanceof Error ? err.message : err ? String(err) : "";
  if (/timeout/i.test(msg)) return "פג הזמן בהמתנה לשרת הדוא״ל (smtp.gmail.com).";
  if (/535|authentication failed|auth/i.test(msg) && /smtp|535|login|auth/i.test(msg)) {
    return "אימות מול Gmail נכשל. בדקו את סיסמת האפליקציה.";
  }
  if (/before secure TLS|UNEXPECTED_EOF|ERR_SSL|ERR_TLS|SSL|TLS|EPROTO|handshake/i.test(msg)) {
    return "החיבור המאובטח לשרת הדוא״ל נכשל (TLS).";
  }
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH/i.test(msg)) {
    return "לא ניתן להתחבר לשרת הדוא״ל של Gmail.";
  }
  if (msg) return `שליחת הדוא״ל נכשלה: ${safeErrorSnippet(msg)}`;
  return "שליחת הדוא״ל נכשלה.";
}

export type ChangeMailInput = {
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  at: string;
  before: unknown;
  after: unknown;
  revertUrl: string;
  sample?: boolean;
};

export function buildChangeNotification(input: ChangeMailInput): { subject: string; html: string; text: string } {
  const when = new Date(input.at).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
  const before = typeof input.before === "string" ? input.before : JSON.stringify(input.before);
  const after = typeof input.after === "string" ? input.after : JSON.stringify(input.after);
  const sampleBanner = input.sample
    ? `<p style="background:#fff6e8;border:1px solid #e8c36a;border-radius:12px;padding:10px 12px;font-weight:700">זה מייל בדיקה בלבד. קישור «בטל» הוא לדוגמה ואינו מבטל שינוי אמיתי באתר.</p>`
    : "";
  const sampleNote = input.sample
    ? `<p style="font-size:12px;color:#666">קישור הדוגמה: ${esc(input.revertUrl)}</p>`
    : "";
  const subject = input.sample
    ? `בדיקת דוא״ל (דוגמה, לא מבטל שינוי) — ${input.target}`
    : `שינוי עלה לאתר — ${input.target}`;
  const html = `
  <div dir="rtl" style="font-family:Heebo,Arial,sans-serif;max-width:640px;margin:0 auto">
    ${sampleBanner}
    <h2>שינוי של עובד עלה לאתר</h2>
    <p>השינוי כבר מוצג בחנות. אם הוא שגוי — לחצו «בטל» כדי להחזיר את המוצר למצב הקודם.</p>
    <p><b>מי:</b> ${esc(input.actorName)} (${esc(input.actorRole)})<br>
    <b>מה:</b> ${esc(input.action)}<br>
    <b>יעד:</b> ${esc(input.target)}<br>
    <b>מתי:</b> ${esc(when)}</p>
    <p><s>${esc(before)}</s> → <b>${esc(after)}</b></p>
    <p><a href="${esc(input.revertUrl)}" style="display:inline-block;background:#fff;color:#e23b12;border:1px solid #e23b12;padding:10px 16px;border-radius:12px;font-weight:700;text-decoration:none">בטל</a></p>
    ${sampleNote}
  </div>`;
  const text = input.sample
    ? `מייל בדיקה בלבד — קישור «בטל» הוא לדוגמה ואינו מבטל שינוי אמיתי.\n${input.action} ${input.target} ${before} → ${after}\n${input.revertUrl}`
    : `${input.action} ${input.target} ${before} → ${after}\n${input.revertUrl}`;
  return { subject, html, text };
}
