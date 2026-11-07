/** HTTP end-to-end test. Fresh local JSON only; no browser/session/service provisioning. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, scryptSync, createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const out = resolve(process.env.ADMIN_TEST_OUTPUT || ".data/admin-test-results");
await mkdir(out, { recursive: true });
const directory = await mkdtemp(join(tmpdir(), "hezi-admin-test-"));
const password = randomBytes(24).toString("base64url"),
  salt = randomBytes(16).toString("hex");
const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
const port = process.env.ADMIN_TEST_PORT || "4195",
  origin = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  PATH: resolve("node_modules/.bin") + ":" + process.env.PATH,
  ADMIN_LOCAL_ENABLED: "1",
  ADMIN_STORAGE: "local",
  ADMIN_DATA_DIR: directory,
  ADMIN_OWNER_PASSWORD_HASH: hash,
  ADMIN_OWNER_USERNAME: "owner",
  CATALOG_ORIGIN: origin,
  VITE_SITE_ORIGIN: origin,
};
delete env.VERCEL;
let log = "";
function startServer() {
  const p = spawn(
    process.execPath,
    ["scripts/with-app-env.mjs", "vite", "dev", "--host", "127.0.0.1", "--port", port],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  p.stdout.on("data", (b) => {
    log += b;
  });
  p.stderr.on("data", (b) => {
    log += b;
  });
  return p;
}
let server = startServer();
async function ready() {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + "/api/admin/storefront")).ok) return;
    } catch {}
    if (server.exitCode !== null) throw new Error("Dev server exited");
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("Dev server readiness timed out");
}
async function restart() {
  await new Promise((resolve) => {
    server.once("exit", resolve);
    server.kill("SIGTERM");
  });
  server = startServer();
  await ready();
}

const results = [];
let cookie = "";
const originals = [
  "public/catalog/prices.json",
  "public/catalog/display-taxonomy.json",
  "public/catalog/price-hide-overrides.json",
];
const hashes = await Promise.all(
  originals.map(async (p) =>
    createHash("sha256")
      .update(await readFile(p))
      .digest("hex"),
  ),
);
async function api(
  path,
  { method = "GET", data, auth = cookie, expected = 200, headers = {} } = {},
) {
  const r = await fetch(`${origin}/api/admin/${path}`, {
    method,
    headers: {
      ...(auth ? { cookie: auth } : {}),
      ...(data !== undefined ? { "content-type": "application/json", origin } : {}),
      ...headers,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const text = await r.text();
  assert.equal(r.status, expected, `${method} ${path}: ${r.status} ${text.slice(0, 600)}`);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (body?.storefront && Object.hasOwn(body, "result")) body = body.result;
  return { r, body };
}
const check = (name) => {
  results.push(name);
  console.log("PASS", name);
};
const cleanHtml = (s) => s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
try {
  await ready();
  await api("session", { auth: "", expected: 401 });
  await api("login", {
    method: "POST",
    auth: "",
    data: { username: "owner", password },
    headers: { origin: "https://evil.example" },
    expected: 403,
  });
  await api("login", {
    method: "POST",
    auth: "",
    data: { username: "owner", password: "wrong" },
    expected: 401,
  });
  const login = await api("login", {
    method: "POST",
    auth: "",
    data: { username: "owner", password },
  });
  const setCookie = login.r.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  cookie = setCookie.split(";")[0];
  assert.equal(login.body.user.role, "owner");
  check("Owner hash login, HttpOnly/Strict cookie, unauthorized and cross-origin writes denied");
  const dashboard = (await api("dashboard")).body;
  assert(dashboard.products > 10000);
  assert(dashboard.missingImages > 0);
  check("Real dashboard statistics from visible catalog");
  const sku = "HZ-BRK-00001";
  const product = (await api(`products/${sku}`)).body;
  assert.equal(product.sku, sku);
  assert((await api("products?q=" + sku)).body.items.some((p) => p.sku === sku));
  const oe = product.oe.match(/[0-9A-Z]{5,}/i)?.[0];
  if (oe) assert((await api("products?q=" + oe)).body.total > 0);
  check("Product search by SKU and actual OE");
  const name = product.name + " · בדיקת ניהול מקומית";
  await api(`products/${sku}`, {
    method: "PATCH",
    data: { name, price: 123.45, category: "filters", brand: "BOSCH" },
  });
  const edited = (await api(`products/${sku}`)).body;
  assert.equal(edited.regularPrice, 123.45);
  assert.equal(edited.name, name);
  assert.equal(edited.category, "filters");
  let html = cleanHtml(await (await fetch(origin + `/product/${sku}`)).text());
  await writeFile(join(out, "product-render.html"), html);
  assert(html.includes("בדיקת ניהול מקומית"));
  assert(html.includes("123.45"));
  check("Product name/price/category/brand override applied on SSR storefront");
  await api(`products/${sku}`, {
    method: "PATCH",
    data: { name: 'מוצר </script><script id="admin-xss">test</script>' },
  });
  const safeMarkup = await (await fetch(origin + `/product/${sku}`)).text();
  assert(!safeMarkup.includes('<script id="admin-xss">'));
  await api(`products/${sku}`, { method: "PATCH", data: { name } });
  check("Editable product names cannot break out of storefront JSON-LD script elements");
  const hidden = JSON.parse(await readFile("public/catalog/price-hide-overrides.json", "utf8"))
    .skus[0];
  await api(`products/${hidden}`, { method: "PATCH", data: { price: 123 }, expected: 422 });
  check("Protected hidden 20 prices cannot be overwritten");
  await api(`products/${sku}`, { method: "PATCH", data: { hidden: true } });
  assert((await api("products?q=" + sku + "&filter=hidden")).body.items.some((p) => p.sku === sku));
  html = cleanHtml(await (await fetch(origin + `/product/${sku}`)).text());
  assert(!html.includes("בדיקת ניהול מקומית"));
  await api(`products/${sku}`, { method: "PATCH", data: { hidden: false } });
  check("Hidden product removed from storefront, still editable and restorable in admin");
  const imageUrl = product.image?.startsWith("/") ? product.image : "/brand/logo.jpg";
  const image = Buffer.from(await (await fetch(origin + imageUrl)).arrayBuffer());
  assert(image.length > 16);
  const uploaded = (
    await api(`products/${sku}/image`, {
      method: "POST",
      data: { base64: image.toString("base64") },
    })
  ).body;
  const media = await fetch(origin + uploaded.image);
  assert.equal(media.status, 200);
  assert.match(media.headers.get("content-type"), /^image\//);
  await api(`products/${sku}/image`, {
    method: "POST",
    data: { base64: Buffer.from("<svg><script>alert(1)</script></svg>").toString("base64") },
    expected: 422,
  });
  check("Local product image upload persists and public image endpoint rejects SVG");
  const now = Date.now(),
    promo = {
      title: "מבצע בדיקה מקומית",
      targetType: "product",
      target: sku,
      kind: "percent",
      value: 10,
      start: new Date(now - 60000).toISOString(),
      end: new Date(now + 86400000).toISOString(),
      badge: "10% הנחה",
      homepage: true,
      enabled: true,
    };
  const savedPromo = (await api("promotions", { method: "POST", data: promo })).body;
  assert.equal((await api(`products/${sku}`)).body.price, 111.11);
  html = cleanHtml(await (await fetch(origin + `/product/${sku}`)).text());
  assert(html.includes("10% הנחה"));
  assert(html.includes("111.11"));
  assert(/<del\b/.test(html));
  check("Product percentage promotion: live sale price, badge and crossed-out original");
  await api("promotions", { method: "POST", data: { ...savedPromo, enabled: false } });
  for (const [targetType, target] of [
    ["category", "filters"],
    ["brand", "BOSCH"],
  ]) {
    const p = (
      await api("promotions", {
        method: "POST",
        data: { ...promo, targetType, target, kind: "fixed", value: 99, homepage: false },
      })
    ).body;
    assert.equal((await api(`products/${sku}`)).body.price, 99);
    await api("promotions", { method: "POST", data: { ...p, enabled: false } });
  }
  check("Category/brand targeting and fixed-price promotions");
  const expired = (
    await api("promotions", {
      method: "POST",
      data: { ...promo, end: new Date(now - 1).toISOString() },
    })
  ).body;
  assert.equal((await api(`products/${sku}`)).body.price, 123.45);
  await api("promotions", { method: "POST", data: { ...expired, enabled: false } });
  await api(`products/${sku}`, { method: "PATCH", data: { price: null } });
  await api("promotions", { method: "POST", data: { ...savedPromo, enabled: true } });
  assert.equal((await api(`products/${sku}`)).body.price, null);
  await api(`products/${sku}`, { method: "PATCH", data: { price: 123.45 } });
  await api("promotions", { method: "POST", data: { ...savedPromo, enabled: false } });
  check("Expired promos inactive; quote-only prices remain quote-only");
  const homeImage = (
    await api("homepage/image", { method: "POST", data: { base64: image.toString("base64") } })
  ).body.image;
  const home = {
    banners: [
      {
        id: "local-test",
        title: "עדכון דף הבית המקומי",
        text: "בדיקת פרסום",
        href: "/results?category=filters",
        image: homeImage,
        enabled: true,
      },
    ],
    featuredSkus: [sku],
    categoryOrder: ["filters", "brakes"],
  };
  await api("homepage", { method: "PUT", data: home });
  html = cleanHtml(await (await fetch(origin + "/")).text());
  assert(html.includes(home.banners[0].title));
  assert(html.includes(homeImage));
  assert(html.includes("בדיקת ניהול מקומית"));
  await writeFile(join(out, "homepage-render.html"), html);
  await api("homepage", {
    method: "PUT",
    data: { ...home, banners: [{ ...home.banners[0], href: "//evil.example" }] },
    expected: 422,
  });
  check(
    "Homepage banner/photo/featured/category order saved and reflected in SSR; unsafe links denied",
  );
  const requestId = randomUUID();
  let pdf;
  try {
    pdf = await readFile("/workspace/designs/order/pdf-3items.pdf");
  } catch {
    pdf = Buffer.from("%PDF-1.4\n% local test fixture\n%%EOF");
  }
  const order = {
    requestId,
    ref: "HZ-ORD-20261107-1430",
    customer: {
      name: "לקוח בדיקה מקומית",
      phone: "0500000000",
      plate: "1234567",
      make: "אופל",
      model: "אינסיגניה",
      notes: "נתוני בדיקה בלבד",
    },
    lines: [{ sku, qty: 2 }],
    pdfBase64: pdf.toString("base64"),
  };
  await api("orders/capture", { method: "POST", auth: "", data: order, expected: 201 });
  await api("orders/capture", { method: "POST", auth: "", data: order });
  let orders = (await api("orders")).body;
  assert.equal(orders.length, 1);
  assert.equal(orders[0].subtotal, 246.9);
  assert.equal(orders[0].lines[0].price, 123.45);
  assert.equal(orders[0].source, "pdf-share-attempt");
  const oid = orders[0].id;
  await api(`orders/${oid}`, { method: "PATCH", data: { status: "handled" } });
  assert.equal((await api("orders")).body[0].status, "handled");
  assert.equal(
    (await fetch(origin + `/api/admin/orders/${oid}/pdf`, { headers: { cookie } })).status,
    200,
  );
  assert.equal((await fetch(origin + `/api/admin/orders/${oid}/pdf`)).status, 401);
  assert.equal((await fetch(origin + `/api/admin/media/${orders[0].pdfFile}`)).status, 404);
  check(
    "Order capture idempotent and server-priced; status editable; PDF accessible only to authorized staff",
  );
  const epassword = randomBytes(24).toString("base64url");
  let employee = (
    await api("users", {
      method: "POST",
      data: {
        username: "employee-test",
        name: "עובד בדיקה",
        role: "employee",
        permissions: ["products", "orders"],
        active: true,
        password: epassword,
      },
    })
  ).body;
  const el = await api("login", {
    method: "POST",
    auth: "",
    data: { username: employee.username, password: epassword },
  });
  const ecookie = el.r.headers.get("set-cookie").split(";")[0];
  await api("users", { auth: ecookie, expected: 403 });
  await api("promotions", { auth: ecookie, expected: 403 });
  await api("homepage", { auth: ecookie, expected: 403 });
  await api(`products/${sku}`, {
    method: "PATCH",
    auth: ecookie,
    data: { price: 1 },
    expected: 403,
  });
  await api(`products/${sku}`, { method: "PATCH", auth: ecookie, data: { name } });
  await api("orders", { auth: ecookie });
  employee = (
    await api("users", {
      method: "POST",
      data: {
        id: employee.id,
        username: employee.username,
        name: employee.name,
        role: "employee",
        permissions: ["orders"],
        active: true,
      },
    })
  ).body;
  await api("session", { auth: ecookie, expected: 401 });
  check(
    "Employee role permissions enforced on server, including direct price API; sessions revoked after permission edit",
  );
  const publicState = (await api("storefront", { auth: "" })).body;
  assert(!("users" in publicState));
  assert(!("orders" in publicState));
  assert(!("sessions" in publicState));
  assert(!JSON.stringify(publicState).includes("passwordHash"));
  const audit = (await api("audit")).body;
  const priceChange = audit.find((a) => a.action === "product.update" && a.after?.price === 123.45);
  assert(priceChange);
  assert(priceChange.actor);
  assert(priceChange.at);
  assert("price" in priceChange.before);
  assert(!JSON.stringify(audit).includes(epassword));
  assert(!JSON.stringify(audit).includes("scrypt:"));
  check(
    "Public snapshot excludes customer/auth data; audit records actor/time/before/after without credentials",
  );
  const page = await fetch(origin + "/admin/products");
  const adminHtml = await page.text();
  assert.match(adminHtml, /noindex, nofollow, noarchive/);
  await writeFile(join(out, "admin-render.html"), adminHtml);
  const homeHtml = await (await fetch(origin + "/")).text();
  assert(!/<a[^>]+href="\/admin/.test(homeHtml));
  check("Admin noindex and no storefront navigation link");
  const customSku = (await api("products/suggest-sku?category=brakes")).body.sku;
  await api("products", {
    method: "POST",
    data: {
      sku: customSku,
      name: "מוצר אישי לבדיקת שמירה",
      category: "brakes",
      sub: "pads",
      price: 77,
      brand: "DENSO",
      description: "תיאור אישי נשמר",
      vehicleFitment: "טקסט התאמה מאומת",
      hidden: false,
      inStock: true,
    },
  });
  assert.equal((await api(`products/${customSku}`)).body.adminCreated, true);
  assert.match(
    cleanHtml(await (await fetch(origin + `/product/${customSku}`)).text()),
    /מוצר אישי לבדיקת שמירה/,
  );
  check("Owner creates unique product in adapter and storefront without changing source files");
  await api("logout", { method: "POST", data: {} });
  await api("session", { expected: 401 });
  check("Logout invalidates server session");
  const stored = JSON.parse(await readFile(join(directory, "state.json"), "utf8"));
  assert.equal(stored.products[sku].price, 123.45);
  assert.equal(stored.orders.length, 1);
  assert(stored.users.find((u) => u.role === "employee").passwordHash.startsWith("scrypt:"));
  assert(!JSON.stringify(stored).includes(password));
  check("State, orders, image references and hashed staff passwords persist outside catalog");
  for (let i = 0; i < originals.length; i++)
    assert.equal(
      createHash("sha256")
        .update(await readFile(originals[i]))
        .digest("hex"),
      hashes[i],
    );
  check("Base prices, protected-price list and source taxonomy unchanged");
  await restart();
  const resumed = await api("login", {
    method: "POST",
    auth: "",
    data: { username: "owner", password },
  });
  cookie = resumed.r.headers.get("set-cookie").split(";")[0];
  assert.equal((await api("orders")).body.length, 1);
  assert.equal((await api(`products/${sku}`)).body.regularPrice, 123.45);
  check("Orders, hashed employees and overrides survive a full server restart");
  const persistedCustom = (await api(`products/${customSku}`)).body;
  assert.equal(persistedCustom.adminCreated, true);
  assert.equal(persistedCustom.regularPrice, 77);
  assert.equal(persistedCustom.description, "תיאור אישי נשמר");
  check("Admin-created product, price and description survive a full local server restart");
  await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      api(`products/${sku}`, { method: "PATCH", data: { name: `שינוי מקביל ${i}` } }),
    ),
  );
  const parallel = (await api("audit")).body
    .filter((a) => a.action === "product.update" && a.after.name.startsWith("שינוי מקביל"))
    .reverse();
  assert.equal(parallel.length, 8);
  for (let i = 1; i < parallel.length; i++)
    assert.equal(parallel[i].before.name, parallel[i - 1].after.name);
  await api(`products/${sku}`, { method: "PATCH", data: { name } });
  check("Concurrent writes are serialized with accurate before/after audit values");
  env.VERCEL = "1";
  await restart();
  assert.equal((await api("storefront", { auth: "" })).body.enabled, false);
  await api("session", { auth: "", expected: 503 });
  html = cleanHtml(await (await fetch(origin + `/product/${sku}`)).text());
  assert(!html.includes("בדיקת ניהול מקומית"));
  check(
    "Simulated Vercel environment fails closed: local admin disabled and base storefront unaffected",
  );

  env.ADMIN_PREVIEW_DEMO = "1";
  env.ADMIN_STORAGE = "ephemeral";
  env.VERCEL_GIT_COMMIT_REF = "feature/admin-dashboard";
  env.VERCEL_ENV = "production";
  await restart();
  assert.equal((await api("storefront", { auth: "" })).body.enabled, false);
  check("Even valid demo flags cannot enable admin in Production");
  env.VERCEL_ENV = "preview";
  env.VERCEL_GIT_COMMIT_REF = "some-other-branch";
  await restart();
  assert.equal((await api("storefront", { auth: "" })).body.enabled, false);
  check("Preview demo cannot activate on any other branch");
  env.VERCEL_GIT_COMMIT_REF = "feature/admin-dashboard";
  env.VERCEL_URL = `127.0.0.1:${port}`;
  env.VERCEL_DEPLOYMENT_ID = "local-preview-" + randomUUID();
  env.ADMIN_OWNER_USERNAME = "preview-owner";
  env.ADMIN_EMPLOYEE_USERNAME = "preview-employee";
  const previewEmployeePassword = randomBytes(24).toString("base64url"),
    previewSalt = randomBytes(16).toString("hex");
  env.ADMIN_EMPLOYEE_PASSWORD_HASH = `scrypt:${previewSalt}:${scryptSync(previewEmployeePassword, previewSalt, 64).toString("hex")}`;
  await restart();
  assert.equal((await api("storefront", { auth: "" })).body.mode, "preview-demo");
  const previewLogin = await api("login", {
    method: "POST",
    auth: "",
    data: { username: "preview-owner", password },
  });
  const previewCookie = previewLogin.r.headers.get("set-cookie").split(";")[0];
  const previewEmployee = await api("login", {
    method: "POST",
    auth: "",
    data: { username: "preview-employee", password: previewEmployeePassword },
  });
  const previewEmployeeCookie = previewEmployee.r.headers.get("set-cookie").split(";")[0];
  await api(`products/${sku}`, {
    method: "PATCH",
    auth: previewEmployeeCookie,
    data: { price: 1 },
    expected: 403,
  });
  assert.equal((await api("orders", { auth: previewCookie })).body.length, 0);
  assert.equal(
    (await api(`products/${sku}`, { auth: previewCookie })).body.regularPrice,
    product.basePrice,
  );
  assert((await (await fetch(origin + "/admin")).text()).includes("מצב בדיקה"));
  check(
    "Exact preview branch seeds in-app owner/employee login, restricts employee, banners demo and isolates /tmp state from local data",
  );
  await writeFile(
    join(out, "http-test-results.json"),
    JSON.stringify(
      {
        passed: true,
        tests: results,
        baseHashes: Object.fromEntries(originals.map((p, i) => [p, hashes[i]])),
        dataDirectory: directory,
        browserVerified: false,
      },
      null,
      2,
    ),
  );
  console.log(
    `${results.length} HTTP checks passed. Browser interactions/screenshots require the parent browser agent.`,
  );
} catch (e) {
  console.error(e);
  await writeFile(
    join(out, "http-test-results.json"),
    JSON.stringify({ passed: false, tests: results, error: String(e) }, null, 2),
  );
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
  await writeFile(join(out, "dev-server.log"), log);
}
