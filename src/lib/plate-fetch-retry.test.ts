import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchPlateWithRetry, isRetryablePlateFailure, PLATE_RETRY_BUDGET_MS } from "./plate-fetch-retry.ts";

const okBody = {
  ok: true,
  found: true,
  source: "053cea08-09bc-40ec-8f7a-156f0677aff3",
  sourceLabel: "משרד הרישוי",
  vehicle: { manufacturer: "סיאט", commercialName: "ATECA XPERIENCE", mapping: { confidence: "mapped", make: "סיאט", model: "אטקה", year: "2021" } },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const challenge = (status = 429) =>
  new Response("<!doctype html><title>Vercel Security Checkpoint</title>", {
    status,
    headers: { "content-type": "text/html", "x-vercel-mitigated": "challenge" },
  });

function harness(responses: Array<Response | Error>) {
  let clock = 0;
  const calls: number[] = [];
  const sleeps: number[] = [];
  return {
    calls,
    sleeps,
    deps: {
      now: () => clock,
      sleep: async (ms: number) => {
        sleeps.push(ms);
        clock += ms;
      },
      fetchImpl: async () => {
        calls.push(clock);
        clock += 300;
        const next = responses.shift();
        if (!next) throw new Error("no more responses");
        if (next instanceof Error) throw next;
        return next;
      },
    },
  };
}

test("a blocked (429 challenge) request is retried and then succeeds", async () => {
  const h = harness([challenge(429), json(okBody)]);
  const result = await fetchPlateWithRetry("57050902", h.deps);
  assert.equal(result.ok, true);
  assert.equal(h.calls.length, 2);
});

test("403 challenge, non-JSON and network errors are retried", async () => {
  const h = harness([challenge(403), new Response("oops", { status: 200 }), new TypeError("Failed to fetch"), json(okBody)]);
  const result = await fetchPlateWithRetry("57050902", h.deps);
  assert.equal(result.ok, true);
  assert.equal(h.calls.length, 4);
});

test("still blocked after retries → retryable 'blocked' error within the time budget", async () => {
  const h = harness([challenge(), challenge(), challenge(), challenge(), challenge()]);
  const result = await fetchPlateWithRetry("57050902", h.deps);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error, "blocked");
  assert.equal(result.retryable, true);
  assert.match(result.message, /נסו שוב/);
  assert.equal(isRetryablePlateFailure(result), true);
  assert.ok(h.calls.length >= 3 && h.calls.length <= 4, `calls=${h.calls.length}`);
  const total = h.sleeps.reduce((a, b) => a + b, 0) + h.calls.length * 300;
  assert.ok(total < PLATE_RETRY_BUDGET_MS, `total=${total}`);
});

test("our own JSON 503 / rate limit is retried; invalid plate is not", async () => {
  const busy = harness([json({ ok: false, error: "upstream", message: "x" }, 503), json(okBody)]);
  assert.equal((await fetchPlateWithRetry("57050902", busy.deps)).ok, true);
  assert.equal(busy.calls.length, 2);

  const invalid = harness([json({ ok: false, error: "invalid", message: "bad" }, 400)]);
  const r = await fetchPlateWithRetry("1", invalid.deps);
  assert.equal(invalid.calls.length, 1);
  assert.equal(r.ok, false);
  assert.equal(isRetryablePlateFailure(r), false);
});

test("a long retry-after hint that does not fit the budget stops early", async () => {
  const h = harness([json({ ok: false, error: "rate_limited", message: "busy", retryAfterMs: 60_000 }, 429)]);
  const r = await fetchPlateWithRetry("57050902", h.deps);
  assert.equal(h.calls.length, 1);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, "rate_limited");
  assert.equal(isRetryablePlateFailure(r), true);
});

test("not found is returned as-is, without retry", async () => {
  const h = harness([json({ ok: true, found: false, message: "לא נמצא" })]);
  const r = await fetchPlateWithRetry("1234567", h.deps);
  assert.equal(h.calls.length, 1);
  assert.equal(r.ok && !r.found, true);
});
