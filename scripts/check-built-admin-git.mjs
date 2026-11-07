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
  const r = await app.fetch(
    new Request("https://local.invalid" + path, {
      method,
      headers: { origin: "https://local.invalid", "content-type": "application/json", cookie },
      body: data ? JSON.stringify(data) : undefined,
    }),
  );
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
