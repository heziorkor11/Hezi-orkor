import { timingSafeEqual } from "node:crypto";

export function cronSecretConfigured(): boolean {
  return Boolean((process.env.CRON_SECRET || "").trim());
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Vercel Cron sends Authorization: Bearer $CRON_SECRET. Fail closed if the secret is unset. */
export function authorizeCronRequest(req: Request): boolean {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return safeEqual(auth, `Bearer ${secret}`);
}
