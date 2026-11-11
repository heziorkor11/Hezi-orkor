import { build } from "vite";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const root = process.cwd(),
  dir = await mkdtemp(join(tmpdir(), "image-first-client-"));
await build({
  configFile: false,
  logLevel: "error",
  resolve: { alias: { "@": resolve("src") } },
  build: {
    ssr: "src/lib/catalog-search.ts",
    outDir: dir,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
globalThis.window = {};
globalThis.fetch = async (url) => {
  assert.ok(String(url).startsWith("/catalog/"));
  try {
    return new Response(await readFile(join(root, "public", String(url))), {
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response("missing", { status: 404 });
  }
};
const mod = await import(pathToFileURL(join(dir, "catalog-search.js")));
const results = [];
for (const state of [
  { category: "fluids", page: 1 },
  { category: "fluids", page: 2 },
  { q: "תוספים" },
  { category: "additives" },
]) {
  const r = await mod.loadListing(state);
  console.log(state, r.items.length, r.total);
  assert.ok(r.items.length > 0);
  results.push(r);
}

assert.deepEqual(
  results.map((r) => [r.items.length, r.total]),
  [
    [60, 92],
    [32, 92],
    [17, 17],
    [17, 17],
  ],
);
const fluids = [...results[0].items, ...results[1].items];
assert.equal(new Set(fluids.map((p) => p.sku)).size, 92);
assert.deepEqual(
  new Set(results[2].items.map((p) => p.sku)),
  new Set(results[3].items.map((p) => p.sku)),
  "Hebrew additives search and category return the same SKU set",
);
console.log(
  "PASS client-path regression: fluids 60+32/92, Hebrew additives search and category 17, no duplicate SKUs. Listing order is covered by check-listing-sort.mjs. This is not browser interaction QA.",
);
