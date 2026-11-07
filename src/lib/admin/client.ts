import type { OrderCustomer } from "../order-quote";
import { adminSnapshot } from "./overlay";
export async function adminRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(`/api/admin/${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // Hosting protection/proxies may answer with HTML, including on 429.
  // Never expose their body or a JSON SyntaxError to the person signing in.
  let data: { error?: string } | null = null;
  try {
    data = JSON.parse(await r.text());
  } catch {
    // Handled below using status only; do not render untrusted HTML.
  }
  if (r.status === 429) {
    const ours = r.headers.get("x-admin-error") === "rate-limit";
    throw new Error(
      ours
        ? data?.error || "יותר מדי ניסיונות כניסה. המתינו דקה ונסו שוב."
        : "הבקשה נחסמה זמנית על ידי הגנת האתר. המתינו דקה, רעננו את הדף והשלימו בדיקת אבטחה אם תופיע, ואז נסו שוב.",
    );
  }
  if (!data || typeof data !== "object") {
    throw new Error(
      "השרת החזיר תשובה לא צפויה. רעננו את הדף, השלימו בדיקת אבטחה אם תופיע ונסו שוב.",
    );
  }
  if (!r.ok) {
    if (r.status === 401) window.dispatchEvent(new Event("admin:unauthorized"));
    throw new Error(data?.error || "הפעולה לא הושלמה");
  }
  return data as T;
}
export async function capturePdfOrder(args: {
  requestId: string;
  ref: string;
  customer: OrderCustomer;
  lines: { sku: string; qty: number }[];
  blob: Blob;
}) {
  if (!adminSnapshot().enabled) return { recorded: false, disabled: true };
  const bytes = new Uint8Array(await args.blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return adminRequest<{ recorded: boolean }>("orders/capture", "POST", {
    requestId: args.requestId,
    ref: args.ref,
    customer: args.customer,
    lines: args.lines,
    pdfBase64: btoa(binary),
  });
}
export function readUpload(file: File): Promise<string> {
  if (file.size > 2_000_000) return Promise.reject(new Error("תמונה עד 2MB"));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("לא ניתן לקרוא את התמונה"));
    reader.readAsDataURL(file);
  });
}
