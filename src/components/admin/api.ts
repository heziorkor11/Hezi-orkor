import type { SafeUser } from "@/lib/admin/types";

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers || {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data && typeof data === "object" && "error" in data && data.error ? String(data.error) : `שגיאה ${res.status}`);
  }
  return data;
}

export type MeResponse = { user: SafeUser | null; mode?: string };

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", dateStyle: "short", timeStyle: "short" });
}

export function formatPrice(n: number | null | undefined) {
  if (n == null) return "הצעת מחיר";
  return `${n} ₪`;
}

export const STATUS_CLASS: Record<string, string> = {
  new: "st st-new",
  checking: "st st-check",
  preparing: "st st-prep",
  shipped: "st st-ship",
  done: "st st-done",
};

export const STATUS_LABEL: Record<string, string> = {
  new: "חדשה",
  checking: "בבדיקה",
  preparing: "בהכנה",
  shipped: "נשלחה / נאספה",
  done: "הושלמה",
};

export const DELIVERY_LABEL: Record<string, string> = {
  pickup: "איסוף עצמי",
  delivery: "משלוח",
  "": "",
};
