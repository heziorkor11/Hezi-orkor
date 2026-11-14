import assert from "node:assert/strict";
import { test } from "node:test";
import { changeFromFields, notifyProductChange, sheetsHookConfigured } from "./notify-product-change.ts";

test("notifyProductChange no-ops when SHEETS_SYNC_URL is unset", async () => {
  const prevUrl = process.env.SHEETS_SYNC_URL;
  const prevSecret = process.env.SHEETS_SYNC_SECRET;
  delete process.env.SHEETS_SYNC_URL;
  delete process.env.SHEETS_SYNC_SECRET;
  let called = 0;
  const orig = globalThis.fetch;
  globalThis.fetch = (async () => {
    called += 1;
    return new Response("ok");
  }) as typeof fetch;
  try {
    assert.equal(sheetsHookConfigured(), false);
    await notifyProductChange({ action: "add", sku: "HZ-CAF-00268" });
    assert.equal(called, 0);
  } finally {
    globalThis.fetch = orig;
    if (prevUrl == null) delete process.env.SHEETS_SYNC_URL;
    else process.env.SHEETS_SYNC_URL = prevUrl;
    if (prevSecret == null) delete process.env.SHEETS_SYNC_SECRET;
    else process.env.SHEETS_SYNC_SECRET = prevSecret;
  }
});

test("notifyProductChange POSTs JSON with the shared-secret header when URL is set", async () => {
  const prevUrl = process.env.SHEETS_SYNC_URL;
  const prevSecret = process.env.SHEETS_SYNC_SECRET;
  process.env.SHEETS_SYNC_URL = "https://example.invalid/sheets-hook";
  process.env.SHEETS_SYNC_SECRET = "test-hook-secret";
  const calls: { url: string; method?: string; headerNames: string[]; hasSecretHeader: boolean; body: unknown }[] = [];
  const orig = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({
      url: String(input),
      method: init?.method,
      headerNames: [...headers.keys()],
      hasSecretHeader: headers.get("SHEETS_SYNC_SECRET") === "test-hook-secret",
      body: JSON.parse(String(init?.body || "{}")),
    });
    return new Response("ok", { status: 200 });
  }) as typeof fetch;
  try {
    assert.equal(sheetsHookConfigured(), true);
    await notifyProductChange({ action: "price", sku: "HZ-CAF-00268", fields: ["price"], actor: "QA" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://example.invalid/sheets-hook");
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].hasSecretHeader, true);
    const body = calls[0].body as { action?: string; sku?: string; at?: string };
    assert.equal(body.action, "price");
    assert.equal(body.sku, "HZ-CAF-00268");
    assert.equal(typeof body.at, "string");
  } finally {
    globalThis.fetch = orig;
    if (prevUrl == null) delete process.env.SHEETS_SYNC_URL;
    else process.env.SHEETS_SYNC_URL = prevUrl;
    if (prevSecret == null) delete process.env.SHEETS_SYNC_SECRET;
    else process.env.SHEETS_SYNC_SECRET = prevSecret;
  }
});

test("changeFromFields maps a single field to a specific action", () => {
  assert.equal(changeFromFields(["price"]).action, "price");
  assert.equal(changeFromFields(["hidden"]).action, "hide");
  assert.equal(changeFromFields(["name", "price"]).action, "edit");
});
