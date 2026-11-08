/** Real emitted Vercel handler; fake GitHub API; read-only working directory. */
import assert from "node:assert/strict";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { fakeGitHub, configureGitTest } from "./git-storage-fixture.mjs";
const handler = new URL("../.vercel/output/functions/__server.func/index.mjs", import.meta.url);
configureGitTest();
const password = randomBytes(24).toString("hex"),
  salt = randomBytes(16).toString("hex");
process.env.ADMIN_OWNER_PASSWORD_HASH = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
process.env.ADMIN_OWNER_USERNAME = "owner";
process.env.VERCEL_URL = "git-test-" + randomUUID() + ".vercel.app";
const gh = fakeGitHub();
globalThis.fetch = gh.fetch;
process.chdir("/proc");
const { default: app } = await import(handler.href);
let cookie = "";
async function call(path, method = "GET", data, expected = 200) {
  let r = await app.fetch(
    new Request("https://local.invalid" + path, {
      method,
      headers: { origin: "https://local.invalid", "content-type": "application/json", cookie },
      body: data ? JSON.stringify(data) : undefined,
    }),
  );
  for (let i = 0; i < 3 && method === "GET" && [301, 302, 303, 307, 308].includes(r.status); i++) {
    r = await app.fetch(
      new Request(new URL(r.headers.get("location"), "https://local.invalid"), {
        headers: { cookie },
      }),
    );
  }
  const text = await r.text();
  assert.equal(r.status, expected, path + ": " + text.slice(0, 300));
  return {
    r,
    text,
    data: r.headers.get("content-type")?.includes("application/json")
      ? JSON.parse(text)
      : undefined,
  };
}
const login = await call("/api/admin/login", "POST", { username: "owner", password });
cookie = login.r.headers.get("set-cookie").split(";")[0];
await call("/api/admin/dashboard");
assert.deepEqual((await call("/api/admin/bulk-tiers")).data, []);
const initialBulkPage = (await call("/results?category=workshop-packs")).text;
assert.match(initialBulkPage, /bulk-unit-page/);
assert.match(initialBulkPage, /מארז אחד/);
assert.match(initialBulkPage, /data-bulk-unit-price/);
assert.match(initialBulkPage, /76\.42/);
assert.doesNotMatch(initialBulkPage, /data-bulk-savings/);
const staleVehicleBulk = (await call("/results?category=workshop-packs&make=INVALID&year=1900"))
  .text;
assert.equal(
  (staleVehicleBulk.match(/data-bulk-unit-value/g) || []).length,
  (initialBulkPage.match(/data-bulk-unit-value/g) || []).length,
);
console.log(
  "PASS built unit-value page: concept hero/cards, computed per-unit price, no default savings, vehicle optional",
);

await call("/api/admin/products/HZ-GEN-00010", "PATCH", { price: 100 });
await call("/api/admin/products/HZ-GEN-00011", "PATCH", { price: 200 });
const bulk = (
  await call("/api/admin/bulk-tiers", "POST", {
    targetType: "category",
    target: "workshop-packs",
    enabled: true,
    public: true,
    aggregate: true,
    tiers: [{ minPacks: 5, percent: 10 }],
  })
).data.result;
assert.equal((await call("/api/admin/bulk-tiers")).data[0].tiers[0].percent, 10);
assert.match((await call("/results?category=workshop-packs")).text, /כמות אחרת/);
const bulkOrder = {
  requestId: randomUUID(),
  ref: "HZ-ORD-20261107-2222",
  customer: { name: "בדיקה", phone: "0501234567", plate: "12345678" },
  lines: [
    { sku: "HZ-GEN-00010", qty: 2 },
    { sku: "HZ-GEN-00011", qty: 3 },
  ],
};
await call("/api/admin/orders/capture", "POST", bulkOrder, 201);
const bulkOrders = (await call("/api/admin/orders")).data;
const captured = bulkOrders.find((o) => o.ref === "HZ-ORD-20261107-2222");
assert.equal(captured.subtotal, 720);
assert.equal(captured.lines[0].price, 90);
assert.equal(captured.lines[1].price, 180);
await call("/api/admin/bulk-tiers", "POST", { ...bulk, tiers: [{ minPacks: 1, percent: 10 }] });
const discountedBulkPage = (await call("/results?category=workshop-packs")).text;
assert.match(discountedBulkPage, /data-bulk-savings/);
assert.match(discountedBulkPage, /חסכתם/);
console.log("PASS built unit-value page: owner-configured tier produces real savings in SSR");
await call("/api/admin/bulk-tiers", "POST", { ...bulk, public: false });
assert.deepEqual((await call("/api/admin/storefront")).data.bulkRules[0].tiers, []);
await call("/api/admin/bulk-tiers", "POST", { ...bulk, enabled: false });
console.log(
  "PASS built bulk Git: encrypted persistence, catalog controls, 2+3 cross-SKU packs = 720, quote-only public redaction",
);

await call("/api/admin/products/HZ-BRK-00001", "PATCH", { price: 818 });
await call("/api/admin/promotions", "POST", {
  title: "Git demo",
  targetType: "product",
  target: "HZ-BRK-00001",
  kind: "percent",
  value: 10,
  start: new Date(Date.now() - 60000).toISOString(),
  end: new Date(Date.now() + 86400000).toISOString(),
  badge: "מבצע Git",
  homepage: true,
  enabled: true,
});
for (const path of [
  "/product/HZ-BRK-00001",
  "/results?q=HZ-BRK-00001",
  "/results?category=brakes",
]) {
  const page = await call(path);
  assert.match(page.text, /736\.2/);
  assert.match(page.text, /מבצע Git/);
}
await call("/api/admin/homepage", "PUT", {
  banners: [
    {
      id: "git-banner",
      title: "באנר Git",
      text: "דוגמה",
      href: "/results?category=brakes",
      enabled: true,
    },
  ],
  categoryOrder: ["brakes", "filters"],
  featuredSkus: ["HZ-BRK-00001"],
});
assert.match((await call("/")).text, /באנר Git/);
const suggested = (await call("/api/admin/products/suggest-sku?category=additives")).data.sku;
await call("/api/admin/products", "POST", {
  sku: suggested,
  name: "BG",
  category: "additives",
  sub: "",
  price: "89",
  brand: "Bg",
  description: "Bg",
  vehicleFitment: "",
  hidden: false,
  inStock: true,
});
assert.match((await call("/product/" + suggested)).text, /BG/);
assert.match((await call("/results?q=" + suggested)).text, new RegExp(suggested));
await call("/api/admin/users", "POST", {
  username: "git-employee",
  name: "עובד Git",
  role: "employee",
  permissions: ["products"],
  active: true,
  password,
});
const order = {
  requestId: randomUUID(),
  ref: "HZ-ORD-20261107-2024",
  customer: { name: "דוגמה בלבד", phone: "0501234567", plate: "12345678" },
  lines: [{ sku: suggested, qty: 1 }],
};
await call("/api/admin/orders/capture", "POST", order, 201);
const stored = gh.decrypt();
assert.equal(stored.products[suggested].name, "BG");
assert.equal(stored.products["HZ-BRK-00001"].price, 818);
assert.equal(stored.promotions.length, 1);
assert.equal(stored.home.banners[0].title, "באנר Git");
assert.ok(stored.users.find((u) => u.username === "git-employee"));
assert.ok(stored.audit.some((a) => a.action === "product.update"));
assert.deepEqual(stored.orders, []);
assert.ok(!JSON.stringify(stored).includes("0501234567"));
const publicState = (await call("/api/admin/storefront")).data;
assert.equal(publicState.mode, "git");
for (const key of ["users", "orders", "sessions", "audit"]) assert.ok(!(key in publicState));
assert.ok(gh.writes.length > 0);
assert.ok(gh.writes.every((w) => w.branch === "feature/admin-dashboard"));
const writes = gh.writes.length;
await call("/api/admin/session");
assert.equal(gh.writes.length, writes, "normal reads must not create commits");
console.log(
  "PASS built Git runtime: login, dashboard, 818 override + 10% promo on product/search/category, homepage, created product, encrypted users/audit, public order exclusion, no-op reads; read-only cwd; fake API only.",
);
