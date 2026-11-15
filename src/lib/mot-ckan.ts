/** Server-side CKAN datastore client for data.gov.il. Never log plate numbers. */
import {
  CKAN_DATASTORE_URL,
  MOT_RESOURCES,
  pickSafeMotRecord,
  type MotRegistryId,
  type MotResource,
} from "./mot-resources.ts";

export type CkanErrorCode = "rate_limited" | "upstream" | "timeout";

export class CkanLookupError extends Error {
  code: CkanErrorCode;
  status?: number;
  retryAfterMs?: number;
  constructor(code: CkanErrorCode, message: string, init?: { status?: number; retryAfterMs?: number }) {
    super(message);
    this.name = "CkanLookupError";
    this.code = code;
    this.status = init?.status;
    this.retryAfterMs = init?.retryAfterMs;
  }
}

export type MotRecordHit = {
  resource: MotResource;
  fields: Record<string, unknown>;
};

const DEFAULT_TIMEOUT_MS = 8000;
const CACHE_TTL_HIT_MS = 12 * 60 * 60 * 1000;
const CACHE_TTL_MISS_MS = 15 * 60 * 1000;
const CACHE_TTL_ERROR_MS = 30 * 1000;
const MAX_CACHE = 500;

type CacheEntry =
  | { kind: "hit"; at: number; ttl: number; value: MotRecordHit }
  | { kind: "miss"; at: number; ttl: number }
  | { kind: "error"; at: number; ttl: number; error: CkanLookupError };

const memoryCache = new Map<string, CacheEntry>();

export type CkanDeps = {
  fetch?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
};

function notExpired(entry: CacheEntry, now: number) {
  return now - entry.at < entry.ttl;
}

function touchCache(key: string, entry: CacheEntry) {
  if (memoryCache.size >= MAX_CACHE) {
    const first = memoryCache.keys().next().value;
    if (first) memoryCache.delete(first);
  }
  memoryCache.set(key, entry);
}

export function clearMotCkanCache() {
  memoryCache.clear();
}

function cacheKey(plate: string) {
  // Key is the normalized plate; never print this key.
  return `p:${plate}`;
}

function retryAfterMs(res: Response) {
  const raw = res.headers.get("retry-after");
  if (!raw) return 15_000;
  const secs = Number(raw);
  if (Number.isFinite(secs) && secs >= 0) return Math.min(120_000, secs * 1000);
  const when = Date.parse(raw);
  if (Number.isFinite(when)) return Math.min(120_000, Math.max(0, when - Date.now()));
  return 15_000;
}

async function datastoreSearch(
  resource: MotResource,
  plate: string,
  deps: CkanDeps,
): Promise<Record<string, unknown> | undefined> {
  const fetchImpl = deps.fetch || fetch;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const variants: Array<string | number> = [Number(plate), plate];
  if (!Number.isFinite(Number(plate))) variants.shift();

  let lastError: CkanLookupError | undefined;
  for (const value of variants) {
    const body = {
      resource_id: resource.resourceId,
      filters: { mispar_rechev: value },
      limit: 1,
      // Some registries lack optional columns; requesting a missing field
      // makes CKAN return success:false. Always sanitize the record instead.
    };
    let attempt = 0;
    while (attempt < 2) {
      attempt += 1;
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const res = await fetchImpl(CKAN_DATASTORE_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            "user-agent": "HeziOrkorStorefront/1.0 (vehicle-fitment; no personal data)",
          },
          body: JSON.stringify(body),
          signal: ac.signal,
        });
        if (res.status === 429) {
          throw new CkanLookupError("rate_limited", "rate limited", {
            status: 429,
            retryAfterMs: retryAfterMs(res),
          });
        }
        if (res.status >= 500 && attempt < 2) {
          continue;
        }
        if (!res.ok) {
          throw new CkanLookupError("upstream", `status ${res.status}`, { status: res.status });
        }
        const json = (await res.json()) as {
          success?: boolean;
          result?: { records?: Record<string, unknown>[] };
        };
        if (!json?.success) {
          throw new CkanLookupError("upstream", "ckan success false");
        }
        const rec = json.result?.records?.[0];
        if (rec && typeof rec === "object") return pickSafeMotRecord(rec);
        return undefined;
      } catch (err) {
        if (err instanceof CkanLookupError) {
          lastError = err;
          if (err.code === "rate_limited") throw err;
          if (err.code === "upstream" && attempt < 2) continue;
          throw err;
        }
        const name = err instanceof Error ? err.name : "";
        if (name === "AbortError") {
          lastError = new CkanLookupError("timeout", "timeout");
          throw lastError;
        }
        lastError = new CkanLookupError("upstream", "network");
        if (attempt < 2) continue;
        throw lastError;
      } finally {
        clearTimeout(timer);
      }
    }
  }
  if (lastError) throw lastError;
  return undefined;
}

export async function lookupPlateRecord(plate: string, deps: CkanDeps = {}): Promise<MotRecordHit | undefined> {
  const now = deps.now ? deps.now() : Date.now();
  const key = cacheKey(plate);
  const cached = memoryCache.get(key);
  if (cached && notExpired(cached, now)) {
    if (cached.kind === "hit") return cached.value;
    if (cached.kind === "miss") return undefined;
    throw cached.error;
  }

  try {
    for (const resource of MOT_RESOURCES) {
      const fields = await datastoreSearch(resource, plate, deps);
      if (fields) {
        const value: MotRecordHit = { resource, fields };
        touchCache(key, { kind: "hit", at: now, ttl: CACHE_TTL_HIT_MS, value });
        return value;
      }
    }
    touchCache(key, { kind: "miss", at: now, ttl: CACHE_TTL_MISS_MS });
    return undefined;
  } catch (err) {
    const error =
      err instanceof CkanLookupError ? err : new CkanLookupError("upstream", "upstream");
    touchCache(key, { kind: "error", at: now, ttl: CACHE_TTL_ERROR_MS, error });
    throw error;
  }
}

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const hitsByIp = new Map<string, number[]>();

export function clientIpFromRequest(request: Request) {
  const fwd = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
  const ip = fwd.split(",")[0]?.trim();
  return ip || "unknown";
}

export function consumeRateLimit(ip: string, now = Date.now()) {
  const recent = (hitsByIp.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    const retryAfterMs = Math.max(1000, RATE_WINDOW_MS - (now - recent[0]));
    return { ok: false as const, retryAfterMs };
  }
  recent.push(now);
  hitsByIp.set(ip, recent);
  return { ok: true as const };
}

export function clearMotRateLimit() {
  hitsByIp.clear();
}

export type { MotRegistryId };
