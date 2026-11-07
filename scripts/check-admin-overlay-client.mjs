/** Exercise the real browser-branch overlay code with isolated storage/fetch. */
import ts from "typescript";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const uri = (source) =>
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  ).toString("base64");
const config = uri(await readFile("src/lib/admin/config.ts", "utf8"));
const types = uri(await readFile("src/lib/admin/types.ts", "utf8"));
const source = (await readFile("src/lib/admin/overlay.ts", "utf8"))
  .replaceAll('"./config"', JSON.stringify(config))
  .replaceAll('"./types"', JSON.stringify(types));
const storage = new Map();
const events = new Set();
globalThis.window = {
  localStorage: { getItem: (k) => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
  addEventListener: (_, fn) => events.add(fn),
  removeEventListener: (_, fn) => events.delete(fn),
};
const empty = {
  mode: "preview-demo",
  enabled: true,
  revision: 0,
  products: {},
  promotions: [],
  home: { banners: [], categoryOrder: [] },
};
let server = structuredClone(empty);
globalThis.fetch = async () => Response.json(server);
const overlay = await import(uri(source));
overlay.adoptAdminOverlay(empty);
let notifications = 0;
const unsubscribe = overlay.subscribeAdminOverlay(() => notifications++);
const another = overlay.subscribeAdminOverlay(() => {});
assert.equal(events.size, 1, "One global storage listener even with multiple cards");
overlay.publishAdminMutation("products/HZ-BRK-00001", {
  ...empty,
  revision: 2,
  products: { "HZ-BRK-00001": { price: 818 } },
});
assert.equal(overlay.effectivePrice("HZ-BRK-00001", 817, "brakes", "").price, 818);
assert.equal(notifications, 1);
const promo = {
  id: "test",
  title: "test",
  targetType: "product",
  target: "HZ-BRK-00001",
  kind: "percent",
  value: 10,
  start: new Date(Date.now() - 60000).toISOString(),
  end: new Date(Date.now() + 86400000).toISOString(),
  badge: "מבצע בדיקה",
  enabled: true,
  homepage: false,
};
// Another instance can commit a promo without having the earlier product edit.
overlay.publishAdminMutation("promotions", { ...empty, revision: 2, promotions: [promo] });
assert.equal(overlay.effectivePrice("HZ-BRK-00001", 817, "brakes", "").price, 736.2);
assert.equal(overlay.effectivePrice("HZ-BRK-00001", 817, "brakes", "").regular, 818);
assert.equal(overlay.effectivePrice("HZ-BRK-00001", 817, "brakes", "").promo.badge, "מבצע בדיקה");
assert.equal(notifications, 2);
overlay.adoptAdminOverlay(empty); // stale root render must not revert prices
await overlay.refreshAdminOverlay(true); // empty cold instance must not erase own QA writes
assert.equal(overlay.effectivePrice("HZ-BRK-00001", 817, "brakes", "").price, 736.2);
overlay.publishAdminMutation("products/HZ-TST-90003", {
  ...empty,
  revision: 3,
  products: {
    "HZ-TST-90003": {
      created: true,
      name: "מוצר אישי",
      category: "brakes",
      sub: "pads",
      price: 100,
      description: "תיאור",
      inStock: true,
    },
  },
});
assert.equal(overlay.adminProductOverride("HZ-TST-90003").created, true);
// A full-page/new-tab runtime reads only public edit receipts, not auth/session data.
const fresh = await import(uri(source + "\n// fresh browser runtime"));
fresh.adoptAdminOverlay(empty);
assert.equal(fresh.adminProductOverride("HZ-TST-90003").created, true);
assert.equal(fresh.effectivePrice("HZ-TST-90003", null, "brakes", "").price, 100);
assert.equal(fresh.effectivePrice("HZ-BRK-00001", 817, "brakes", "").price, 736.2);
fresh.adoptAdminOverlay({ ...empty, mode: "local" });
assert.equal(
  fresh.effectivePrice("HZ-BRK-00001", 817, "brakes", "").price,
  817,
  "No demo receipt in local/production mode",
);
assert.doesNotMatch([...storage.values()].join(""), /password|users|sessions|audit|orders/);
unsubscribe();
another();
assert.equal(events.size, 0);
const result = {
  passed: true,
  reactiveNotifications: true,
  staleRootGuard: true,
  price: 736.2,
  regular: 818,
  promoBadge: true,
  coldInstanceWriteReceipts: true,
  newTabReceipt: true,
  previewOnly: true,
  createdProductReceiptAndPrice: true,
};
const out = resolve(process.env.ADMIN_TEST_OUTPUT || ".data/admin-test-results");
await mkdir(out, { recursive: true });
await writeFile(out + "/browser-overlay-test.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
