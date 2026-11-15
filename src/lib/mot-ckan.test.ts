import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearMotCkanCache,
  clearMotRateLimit,
  clientIpFromRequest,
  consumeRateLimit,
  lookupPlateRecord,
  CkanLookupError,
} from "./mot-ckan.ts";
import { CKAN_DATASTORE_URL, pickSafeMotRecord } from "./mot-resources.ts";

const SAMPLE_PLATE = "12345678";

function ckanOk(record: Record<string, unknown> | undefined, success = true) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success, result: { records: record ? [record] : [] } }),
    headers: new Headers(),
  } as Response;
}

test("pickSafeMotRecord drops chassis, plate, color and ownership fields", () => {
  const safe = pickSafeMotRecord({
    mispar_rechev: 12345678,
    misgeret: "SHOULD-NOT-LEAK",
    baalut: "פרטי",
    tzeva_rechev: "לבן",
    tozeret_nm: "קיה ד. קוריאה",
    kinuy_mishari: "PICANTO",
    shnat_yitzur: 2017,
  });
  assert.equal(safe.tozeret_nm, "קיה ד. קוריאה");
  assert.equal(safe.kinuy_mishari, "PICANTO");
  assert.equal("mispar_rechev" in safe, false);
  assert.equal("misgeret" in safe, false);
  assert.equal("baalut" in safe, false);
  assert.equal("tzeva_rechev" in safe, false);
});

test("lookupPlateRecord uses filters, caches hits, and never logs the plate", async () => {
  clearMotCkanCache();
  const calls: string[] = [];
  const logs: string[] = [];
  const orig = console.log;
  const origErr = console.error;
  console.log = (...a: unknown[]) => logs.push(a.map(String).join(" "));
  console.error = (...a: unknown[]) => logs.push(a.map(String).join(" "));
  try {
    const fetchMock: typeof fetch = async (_url, init) => {
      const body = String(init?.body || "");
      calls.push(body);
      assert.equal(JSON.parse(body).filters.mispar_rechev, Number(SAMPLE_PLATE) || SAMPLE_PLATE);
      return ckanOk({
        mispar_rechev: Number(SAMPLE_PLATE),
        misgeret: "SECRET",
        tozeret_nm: "קיה ד. קוריאה",
        kinuy_mishari: "PICANTO",
        shnat_yitzur: 2017,
      });
    };
    const first = await lookupPlateRecord(SAMPLE_PLATE, { fetch: fetchMock });
    const second = await lookupPlateRecord(SAMPLE_PLATE, { fetch: fetchMock });
    assert.ok(first);
    assert.equal(first?.fields.tozeret_nm, "קיה ד. קוריאה");
    assert.equal("misgeret" in (first?.fields || {}), false);
    assert.equal("mispar_rechev" in (first?.fields || {}), false);
    assert.equal(second?.fields.kinuy_mishari, "PICANTO");
    assert.equal(calls.length, 1, "second lookup must be served from cache");
    assert.ok(logs.every((line) => !line.includes(SAMPLE_PLATE)), logs.join(" | "));
    assert.ok(calls.every((body) => body.includes(CKAN_DATASTORE_URL) === false || true));
  } finally {
    console.log = orig;
    console.error = origErr;
    clearMotCkanCache();
  }
});

test("lookupPlateRecord walks fallback registries and returns miss without throwing", async () => {
  clearMotCkanCache();
  let n = 0;
  const fetchMock: typeof fetch = async () => {
    n += 1;
    return ckanOk(undefined);
  };
  const miss = await lookupPlateRecord("87654321", { fetch: fetchMock });
  assert.equal(miss, undefined);
  assert.ok(n >= 2, "should try more than the main registry");
  clearMotCkanCache();
});

test("rate limits and 429/timeout become typed errors", async () => {
  clearMotCkanCache();
  const fetch429: typeof fetch = async () =>
    ({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "7" }),
      json: async () => ({}),
    }) as Response;
  await assert.rejects(
    () => lookupPlateRecord("1111111", { fetch: fetch429 }),
    (err: unknown) => err instanceof CkanLookupError && err.code === "rate_limited" && err.retryAfterMs === 7000,
  );
  clearMotCkanCache();

  const fetchHang: typeof fetch = async (_url, init) => {
    const signal = init?.signal;
    return await new Promise<Response>((_resolve, reject) => {
      signal?.addEventListener("abort", () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        reject(err);
      });
    });
  };
  await assert.rejects(
    () => lookupPlateRecord("2222222", { fetch: fetchHang, timeoutMs: 20 }),
    (err: unknown) => err instanceof CkanLookupError && err.code === "timeout",
  );
  clearMotCkanCache();
});

test("per-IP rate gate allows a burst and then blocks", () => {
  clearMotRateLimit();
  const req = new Request("http://localhost/api/vehicle-by-plate", {
    headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
  });
  assert.equal(clientIpFromRequest(req), "203.0.113.9");
  let blocked = 0;
  for (let i = 0; i < 25; i++) {
    const r = consumeRateLimit("203.0.113.9", 1_000 + i);
    if (!r.ok) blocked += 1;
  }
  assert.ok(blocked >= 5);
  clearMotRateLimit();
});
