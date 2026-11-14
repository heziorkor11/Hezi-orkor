import assert from "node:assert/strict";
import { test } from "node:test";
import {
  changeFromFields,
  flushProductChange,
  needsEnrichment,
  notifyProductChange,
  sheetsHookConfigured,
} from "./notify-product-change.ts";

const FULL: Parameters<typeof flushProductChange>[0] = {
  action: "price",
  sku: "HZ-CAF-00268",
  name: "פילטר מזגן",
  category: "פילטרים",
  subType: "מזגן",
  fitment: "טויוטה קורולה 2018–2022",
  priceDisplayed: 13,
  basePrice: 15,
  image: "https://hezi-orkor.vercel.app/api/catalog-image/HZ-CAF-00268",
  hasImage: true,
  tags: "מבצע",
  stock: "7 יח׳",
  visibility: "מוצג",
  link: "https://hezi-orkor.vercel.app/product/HZ-CAF-00268",
  updatedBy: "QA",
  updatedAt: "14.11.2026 11:52",
};

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
    await flushProductChange({ ...FULL, sku: "HZ-CAF-00268" });
    assert.equal(called, 0);
  } finally {
    globalThis.fetch = orig;
    if (prevUrl == null) delete process.env.SHEETS_SYNC_URL;
    else process.env.SHEETS_SYNC_URL = prevUrl;
    if (prevSecret == null) delete process.env.SHEETS_SYNC_SECRET;
    else process.env.SHEETS_SYNC_SECRET = prevSecret;
  }
});

test("POSTs JSON with secret in the body (not a header), mode upsert, and sheet fields", async () => {
  const prevUrl = process.env.SHEETS_SYNC_URL;
  const prevSecret = process.env.SHEETS_SYNC_SECRET;
  process.env.SHEETS_SYNC_URL = "https://example.invalid/sheets-hook";
  process.env.SHEETS_SYNC_SECRET = "test-hook-secret";
  const calls: { url: string; method?: string; hasSecretHeader: boolean; body: Record<string, unknown> }[] = [];
  const orig = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({
      url: String(input),
      method: init?.method,
      hasSecretHeader: headers.has("SHEETS_SYNC_SECRET") || headers.has("sheets_sync_secret"),
      body: JSON.parse(String(init?.body || "{}")) as Record<string, unknown>,
    });
    return new Response("ok", { status: 200 });
  }) as typeof fetch;
  try {
    assert.equal(sheetsHookConfigured(), true);
    await flushProductChange(FULL);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://example.invalid/sheets-hook");
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].hasSecretHeader, false);
    const body = calls[0].body;
    assert.equal(body.secret, "test-hook-secret");
    assert.equal(body.mode, "upsert");
    assert.equal(body.sku, "HZ-CAF-00268");
    assert.equal(body.name, "פילטר מזגן");
    assert.equal(body.category, "פילטרים");
    assert.equal(body.subType, "מזגן");
    assert.equal(body.fitment, "טויוטה קורולה 2018–2022");
    assert.equal(body.priceDisplayed, 13);
    assert.equal(body.basePrice, 15);
    assert.equal(body.image, FULL.image);
    assert.equal(body.hasImage, true);
    assert.equal(body.tags, "מבצע");
    assert.equal(body.stock, "7 יח׳");
    assert.equal(body.visibility, "מוצג");
    assert.equal(body.link, FULL.link);
    assert.equal(body.updatedBy, "QA");
    assert.equal(body.updatedAt, "14.11.2026 11:52");
  } finally {
    globalThis.fetch = orig;
    if (prevUrl == null) delete process.env.SHEETS_SYNC_URL;
    else process.env.SHEETS_SYNC_URL = prevUrl;
    if (prevSecret == null) delete process.env.SHEETS_SYNC_SECRET;
    else process.env.SHEETS_SYNC_SECRET = prevSecret;
  }
});

test("a failed hook does not throw, so a dashboard save can stay successful", async () => {
  const prevUrl = process.env.SHEETS_SYNC_URL;
  process.env.SHEETS_SYNC_URL = "https://example.invalid/sheets-hook";
  const orig = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;
  try {
    await flushProductChange(FULL);
    notifyProductChange(FULL);
  } finally {
    globalThis.fetch = orig;
    if (prevUrl == null) delete process.env.SHEETS_SYNC_URL;
    else process.env.SHEETS_SYNC_URL = prevUrl;
  }
});

test("changeFromFields maps a single field, and a sku-only change needs enrichment", () => {
  assert.equal(changeFromFields(["price"]).action, "price");
  assert.equal(changeFromFields(["hidden"]).action, "hide");
  assert.equal(changeFromFields(["name", "price"]).action, "edit");
  assert.equal(needsEnrichment({ sku: "HZ-CAF-00268" }), true);
  assert.equal(needsEnrichment(FULL), false);
});
