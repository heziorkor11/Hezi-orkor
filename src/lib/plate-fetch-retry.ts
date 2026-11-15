/**
 * Client-side plate lookup with automatic retry.
 *
 * Vercel bot protection / WAF sometimes answers our own /api/vehicle-by-plate call with a
 * 429 or 403 challenge page (HTML, not JSON). A second try a few seconds later usually
 * passes (15.11.2026: blocked at 18:43, passed 21s later). We retry a few times with a short
 * backoff (total budget under 25s) and, if it still fails, return a retryable error so the
 * UI can show "נסו שוב" with a button. Firewall settings are not touched.
 */
import type { PlateLookupFail, PlateLookupResult } from "./mot-plate-lookup.ts";

export const PLATE_RETRY_DELAYS_MS = [1500, 4000, 8000];
export const PLATE_RETRY_BUDGET_MS = 25_000;

export const PLATE_RETRY_MESSAGE =
  "לא הצלחנו להשלים את החיפוש כרגע: החיבור נחסם זמנית או שהשירות עמוס. ניסינו שוב אוטומטית. לחצו \"נסו שוב\" בעוד כמה שניות, או בחרו רכב ידנית.";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type PlateRetryDeps = {
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  delaysMs?: number[];
  budgetMs?: number;
  /** Called before each automatic retry (attempt is 2, 3, …). */
  onRetry?: (attempt: number) => void;
};

type Attempt =
  | { kind: "done"; result: PlateLookupResult }
  | { kind: "retry"; reason: "blocked" | "network" | "busy"; result?: PlateLookupFail; retryAfterMs?: number }
  | { kind: "timeout" };

const RETRY_STATUSES = new Set([403, 408, 425, 429, 500, 502, 503, 504]);

function isLookupResult(value: unknown): value is PlateLookupResult {
  return Boolean(value && typeof value === "object" && typeof (value as { ok?: unknown }).ok === "boolean");
}

/** Classify one HTTP response from /api/vehicle-by-plate. Exported for tests. */
export async function classifyPlateResponse(res: Response): Promise<Attempt> {
  const ctype = (res.headers.get("content-type") || "").toLowerCase();
  const mitigated = (res.headers.get("x-vercel-mitigated") || "").toLowerCase();
  let body: unknown;
  if (ctype.includes("json")) {
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
  }
  if (!isLookupResult(body)) {
    // HTML challenge page, empty body or broken JSON → treat as a block and retry.
    return { kind: "retry", reason: mitigated || res.status === 403 || res.status === 429 ? "blocked" : "network" };
  }
  if (body.ok) return { kind: "done", result: body };
  if (body.error === "invalid") return { kind: "done", result: body };
  if (RETRY_STATUSES.has(res.status) || body.error === "rate_limited" || body.error === "upstream" || body.error === "timeout") {
    return { kind: "retry", reason: "busy", result: body, retryAfterMs: body.retryAfterMs };
  }
  return { kind: "done", result: body };
}

function finalFailure(last: Attempt | undefined): PlateLookupFail {
  const code: PlateLookupFail["error"] =
    last?.kind === "retry" && last.result && last.result.error !== "invalid" ? last.result.error : last?.kind === "timeout" ? "timeout" : "blocked";
  return { ok: false, error: code, message: PLATE_RETRY_MESSAGE, retryable: true };
}

export async function fetchPlateWithRetry(plate: string, deps: PlateRetryDeps = {}): Promise<PlateLookupResult> {
  const fetchImpl: FetchLike = deps.fetchImpl || ((input, init) => fetch(input, init));
  const sleep = deps.sleep || ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = deps.now || (() => Date.now());
  const delays = deps.delaysMs || PLATE_RETRY_DELAYS_MS;
  const budget = deps.budgetMs ?? PLATE_RETRY_BUDGET_MS;
  const started = now();
  let last: Attempt | undefined;

  for (let attempt = 1; attempt <= delays.length + 1; attempt++) {
    if (attempt > 1) {
      const base = delays[attempt - 2] ?? 0;
      const hinted = last?.kind === "retry" && last.retryAfterMs ? last.retryAfterMs : 0;
      const wait = Math.max(base, hinted);
      // Stop if waiting would leave too little of the budget for another request.
      if (now() - started + wait > budget - 2000) break;
      deps.onRetry?.(attempt);
      await sleep(wait);
    }
    const remaining = budget - (now() - started);
    if (remaining <= 0) break;
    const ac = typeof AbortController !== "undefined" ? new AbortController() : undefined;
    const timer = ac ? setTimeout(() => ac.abort(), remaining) : undefined;
    try {
      const res = await fetchImpl("/api/vehicle-by-plate", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ plate }),
        signal: ac?.signal,
        cache: "no-store",
      });
      last = await classifyPlateResponse(res);
    } catch (err) {
      const aborted = Boolean(err && typeof err === "object" && (err as { name?: string }).name === "AbortError");
      last = aborted ? { kind: "timeout" } : { kind: "retry", reason: "network" };
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (last.kind === "done") return last.result;
    if (last.kind === "timeout") break;
  }
  return finalFailure(last);
}

/** True for failures where a manual "נסו שוב" makes sense. */
export function isRetryablePlateFailure(result: PlateLookupResult | null | undefined): boolean {
  if (!result || result.ok) return false;
  if (result.retryable) return true;
  return result.error === "blocked" || result.error === "rate_limited" || result.error === "upstream" || result.error === "timeout";
}
