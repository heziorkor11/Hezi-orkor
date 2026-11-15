export type NotificationMailType =
  | "orderMaster"
  | "orderCustomer"
  | "orderExtra"
  | "dailySummary"
  | "weeklySummary"
  | "workerChange"
  | "lowStock";

export const NOTIFICATION_MAIL_TYPES: { id: NotificationMailType; label: string; hint: string }[] = [
  { id: "orderMaster", label: "הזמנה חדשה למאסטר", hint: "נשלח לכתובת ADMIN_NOTIFY_EMAIL" },
  { id: "orderExtra", label: "העתק הזמנה לכתובות נוספות", hint: "הכתובות שמופיעות למטה" },
  { id: "orderCustomer", label: "אישור הזמנה ללקוח", hint: "רק אם מילא דוא״ל בעגלה, ורק בייצור" },
  { id: "dailySummary", label: "סיכום יומי", hint: "נשלח בערב לפי שעון UTC (±59 דק׳)" },
  { id: "weeklySummary", label: "סיכום שבועי", hint: "נשלח ביום ראשון בבוקר לפי שעון UTC" },
  { id: "workerChange", label: "שינוי של עובד", hint: "רק לתיבת המאסטר, עם קישור בטל" },
  { id: "lowStock", label: "התראת מלאי נמוך", hint: "כשכמות יורדת לסף או מתחתיו" },
];

export type NotificationSettings = {
  version: 1;
  extraAddresses: string[];
  enabled: Record<NotificationMailType, boolean>;
  lowStockThreshold: number;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  version: 1,
  extraAddresses: [],
  enabled: {
    orderMaster: true,
    orderCustomer: true,
    orderExtra: true,
    dailySummary: true,
    weeklySummary: true,
    workerChange: true,
    lowStock: true,
  },
  lowStockThreshold: 3,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(raw: string | null | undefined): boolean {
  const s = String(raw || "").trim();
  if (!s || s.length > 120) return false;
  if (s.includes("..") || s.startsWith(".") || s.endsWith(".")) return false;
  return EMAIL_RE.test(s);
}

export function normalizeEmail(raw: string): string {
  return String(raw || "").trim().toLowerCase();
}

export function normalizeExtraAddresses(list: unknown, max = 20): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (typeof item !== "string") continue;
    const email = normalizeEmail(item);
    if (!isValidEmail(email) || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
    if (out.length >= max) break;
  }
  return out;
}

export function normalizeNotificationSettings(raw: unknown): NotificationSettings {
  const base = DEFAULT_NOTIFICATION_SETTINGS;
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const enabledSrc = src.enabled && typeof src.enabled === "object" ? (src.enabled as Record<string, unknown>) : {};
  const enabled = { ...base.enabled };
  for (const row of NOTIFICATION_MAIL_TYPES) {
    if (typeof enabledSrc[row.id] === "boolean") enabled[row.id] = enabledSrc[row.id] as boolean;
  }
  let threshold = base.lowStockThreshold;
  if (typeof src.lowStockThreshold === "number" && Number.isInteger(src.lowStockThreshold) && src.lowStockThreshold >= 0 && src.lowStockThreshold <= 9999) {
    threshold = src.lowStockThreshold;
  } else if (typeof src.lowStockThreshold === "string") {
    const n = Number(src.lowStockThreshold);
    if (Number.isInteger(n) && n >= 0 && n <= 9999) threshold = n;
  }
  return {
    version: 1,
    extraAddresses: normalizeExtraAddresses(src.extraAddresses),
    enabled,
    lowStockThreshold: threshold,
  };
}

/** Customer confirmation is production-only so preview never mails a real shopper. */
export function allowCustomerOrderEmail(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export function mailSubjectPrefix(): string {
  return process.env.VERCEL_ENV === "production" ? "" : "[תצוגה] ";
}
