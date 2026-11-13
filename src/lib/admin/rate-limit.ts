type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (cur.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((cur.reset - now) / 1000)) };
  }
  cur.count += 1;
  return { ok: true, retryAfter: 0 };
}

export function rateLimitReset(key: string) {
  buckets.delete(key);
}

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
