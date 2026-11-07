/** Cold real-function tests: no network, filesystem writes restricted to /tmp. */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes, scryptSync, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const fn = resolve(".vercel/output/functions/__server.func");
const out = resolve(process.env.ADMIN_TEST_OUTPUT || ".data/admin-test-results");
if (!process.env.ADMIN_READONLY_PHASE) {
  await mkdir(out, { recursive: true });
  const password = randomBytes(24).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  const env = {
    ...process.env,
    NODE_ENV: "production",
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "feature/admin-dashboard",
    VERCEL_URL: "readonly-smoke.vercel.app",
    ADMIN_PREVIEW_DEMO: "1",
    ADMIN_STORAGE: "ephemeral",
    ADMIN_OWNER_USERNAME: "preview-owner",
    ADMIN_OWNER_PASSWORD_HASH: hash,
    ADMIN_EMPLOYEE_USERNAME: "preview-employee",
    ADMIN_EMPLOYEE_PASSWORD_HASH: hash,
    ADMIN_READONLY_FUNCTION: fn,
    ADMIN_READONLY_PASSWORD: password,
  };
  const run = (phase, cookie = "") => {
    const p = spawnSync(
      process.execPath,
      [
        "--permission",
        "--allow-fs-read=*",
        "--allow-fs-write=/tmp",
        resolve("scripts/check-built-admin-readonly.mjs"),
      ],
      {
        cwd: fn,
        env: {
          ...env,
          ADMIN_READONLY_PHASE: phase,
          ADMIN_READONLY_COOKIE: cookie,
          VERCEL_DEPLOYMENT_ID: "readonly-" + randomBytes(8).toString("hex"),
        },
        encoding: "utf8",
        timeout: 120000,
      },
    );
    assert.equal(p.status, 0, p.stderr + "\n" + p.stdout);
    const line = p.stdout.split("\n").find((x) => x.startsWith("READONLY_RESULT="));
    assert.ok(line, p.stdout);
    return JSON.parse(line.slice("READONLY_RESULT=".length));
  };
  const first = run("login");
  const second = run("resume", first.cookie);
  const result = {
    passed: true,
    readOnlyCwdEnforced: true,
    networkDisabled: true,
    bundledCatalog: true,
    coldInstanceSession: true,
    statuses: second.statuses,
    storefrontRoundtrip: true,
    exactBgInputsWithFreeSku: true,
    postCreatePinPreservesTotalAndPagination: true,
    searchRemainsIndependentOfPin: true,
    blockedAdd00018HasSkuError: true,
    numericStringAndOptionalFields: true,
    hebrewFieldErrors: true,
    createdProductCrudAndPhoto: true,
    createdProductStorefrontSearchCategoryDetail: true,
    createdProductPromo: true,
    skuCollisionAndConcurrentDuplicate: true,
    employeeCreateFlagDefaultDeniedThenGranted: true,
  };
  await writeFile(out + "/built-readonly-test.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} else {
  await assert.rejects(writeFile("must-not-write.txt", "x"), (e) => e.code === "ERR_ACCESS_DENIED");
  globalThis.fetch = async () => {
    throw new Error("Network forbidden in readonly bundle regression");
  };
  const app = (await import(pathToFileURL(process.env.ADMIN_READONLY_FUNCTION + "/index.mjs").href))
    .default;
  const origin = "https://readonly-smoke.vercel.app";
  let cookie = process.env.ADMIN_READONLY_COOKIE;
  const statuses = {};
  async function call(path, method = "GET", body) {
    const r = await app.fetch(
      new Request(origin + path, {
        method,
        headers: {
          origin,
          ...(cookie ? { cookie } : {}),
          ...(body ? { "content-type": "application/json" } : {}),
          "x-vercel-forwarded-for": "192.0.2.50",
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
    const text = await r.text();
    statuses[method + " " + path] = r.status;
    assert.equal(r.status, 200, path + ": " + text.slice(0, 400));
    return { r, text };
  }
  if (process.env.ADMIN_READONLY_PHASE === "login") {
    const { r } = await call("/api/admin/login", "POST", {
      username: "preview-owner",
      password: process.env.ADMIN_READONLY_PASSWORD,
    });
    cookie = r.headers.get("set-cookie").split(";")[0];
    assert.match(r.headers.get("set-cookie"), /Max-Age=28800/);
    console.log("READONLY_RESULT=" + JSON.stringify({ cookie }));
  } else {
    // Fresh process AND fresh /tmp state, identical deployment signing context.
    await call("/api/admin/session");
    await call("/admin");
    await call("/");
    await call("/admin");
    await call("/api/admin/session");
    await call("/api/admin/dashboard");
    const products = await call("/api/admin/products?q=HZ-BRK-00001");
    assert.ok(JSON.parse(products.text).total > 0);
    await call("/api/admin/products/HZ-BRK-00001");
    const editResponse = await call("/api/admin/products/HZ-BRK-00001", "PATCH", { price: 818 });
    const writeReceipt = JSON.parse(editResponse.text);
    assert.equal(writeReceipt.result.regularPrice, 818);
    assert.equal(writeReceipt.storefront.products["HZ-BRK-00001"].price, 818);
    assert.equal(Object.hasOwn(writeReceipt.storefront, "users"), false);
    await call("/api/admin/promotions");
    await call("/api/admin/promotions", "POST", {
      title: "בדיקת קטלוג ארוז",
      targetType: "product",
      target: "HZ-BRK-00001",
      kind: "percent",
      value: 10,
      start: new Date(Date.now() - 60000).toISOString(),
      end: new Date(Date.now() + 86400000).toISOString(),
      badge: "מבצע בדיקה",
      homepage: true,
      enabled: true,
    });
    const overlay = await call("/api/admin/storefront");
    assert.equal(JSON.parse(overlay.text).promotions.length, 1);
    const detail = await call("/product/HZ-BRK-00001");
    assert.match(detail.text, /736\.2/);
    assert.match(detail.text, /מבצע בדיקה/);
    const search = await call("/results?q=HZ-BRK-00001");
    assert.match(search.text, /736\.2/);
    assert.match(search.text, /מבצע בדיקה/);
    const category = await call("/results?category=brakes");
    assert.match(category.text, /736\.2/);
    assert.match(category.text, /מבצע בדיקה/);
    // Created products use only adapter state; exact catalog collision check is atomic.
    const suggested = JSON.parse(
      (await call("/api/admin/products/suggest-sku?category=brakes")).text,
    ).sku;
    assert.match(suggested, /^HZ-BRK-[0-9]{5}$/);
    const newItem = {
      sku: suggested,
      name: "רפידת בלם אישית לבדיקה",
      category: "brakes",
      sub: "pads",
      price: 100,
      brand: "DENSO",
      description: "תיאור מוצר אישי מאומת",
      vehicleFitment: "התאמה מאומתת לדוגמה בלבד",
      inStock: true,
      hidden: false,
    };
    async function raw(path, method, body, auth = cookie) {
      return app.fetch(
        new Request(origin + "/api/admin/" + path, {
          method,
          headers: { origin, "content-type": "application/json", cookie: auth },
          body: body ? JSON.stringify(body) : undefined,
        }),
      );
    }
    const bg = {
      name: "BG",
      category: "additives",
      sub: "",
      sku: "HZ-ADD-00018",
      price: "89",
      brand: "Bg",
      description: "Bg",
    };
    const reservedBg = await raw("products", "POST", bg);
    assert.equal(reservedBg.status, 409);
    const reservedError = await reservedBg.json();
    assert.match(reservedError.fieldErrors.sku, /[א-ת]/);
    assert.equal(reservedError.fieldErrors.name, undefined);
    const available = JSON.parse(
      (await call("/api/admin/products/suggest-sku?category=additives")).text,
    ).sku;
    assert.notEqual(available, "HZ-ADD-00018");
    assert.ok(Number(available.split("-").at(-1)) > 18);
    const bgResult = JSON.parse(
      (await call("/api/admin/products", "POST", { ...bg, sku: available })).text,
    ).result;
    assert.equal(bgResult.name, "BG");
    assert.equal(bgResult.brand, "Bg");
    assert.equal(bgResult.description, "Bg");
    assert.equal(bgResult.regularPrice, 89);
    assert.equal(bgResult.vehicleFitment, "");
    const invalidBg = await raw("products", "POST", { ...bg, name: "B", price: "not-a-number" });
    assert.equal(invalidBg.status, 422);
    const invalidFields = await invalidBg.json();
    assert.match(invalidFields.fieldErrors.name, /[א-ת]/);
    assert.match(invalidFields.fieldErrors.price, /[א-ת]/);
    const emptySku = JSON.parse(
      (await call("/api/admin/products/suggest-sku?category=additives")).text,
    ).sku;
    const optionalResult = JSON.parse(
      (
        await call("/api/admin/products", "POST", {
          name: "BG",
          sku: emptySku,
          category: "additives",
          sub: null,
          brand: null,
          description: null,
          vehicleFitment: null,
          photoBase64: "",
        })
      ).text,
    ).result;
    assert.equal(optionalResult.regularPrice, null);
    assert.equal(optionalResult.description, "");
    const unfiltered = JSON.parse((await call("/api/admin/products")).text);
    const pinned = JSON.parse((await call(`/api/admin/products?pin=${available}`)).text);
    assert.equal(pinned.items[0].sku, available);
    assert.equal(pinned.total, unfiltered.total);
    assert.equal(pinned.pages, unfiltered.pages);
    assert.ok(pinned.total > 10000, "pinning must preserve all products");
    assert.equal(new Set(pinned.items.map((p) => p.sku)).size, pinned.items.length);
    const pinnedCatalog = JSON.parse((await call("/api/admin/products?pin=HZ-BRK-00001")).text);
    assert.equal(pinnedCatalog.items[0].sku, "HZ-BRK-00001");
    const searched = JSON.parse(
      (await call(`/api/admin/products?q=${available}&pin=HZ-BRK-00001`)).text,
    );
    assert.equal(searched.total, 1);
    assert.equal(searched.items[0].sku, available);
    const missingPin = JSON.parse(
      (await call("/api/admin/products?pin=HZ-NONEXISTENT-99999")).text,
    );
    assert.equal(missingPin.total, unfiltered.total);

    assert.equal((await raw("products", "POST", { ...newItem, sku: "HZ-BRK-00001" })).status, 409);
    assert.equal((await raw("products", "POST", { ...newItem, sub: "invalid" })).status, 422);
    assert.equal((await raw("products", "POST", { ...newItem, sku: "not-a-sku" })).status, 422);
    assert.equal((await raw("products", "POST", { ...newItem, created: true })).status, 422);
    const pixel =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=";
    const created = JSON.parse(
      (await call("/api/admin/products", "POST", { ...newItem, photoBase64: pixel })).text,
    );
    assert.equal(created.result.sku, suggested);
    assert.equal(created.result.adminCreated, true);
    assert.equal(created.storefront.products[suggested].created, true);
    const image = await app.fetch(new Request(origin + created.result.image));
    assert.equal(image.status, 200);
    assert.equal((await raw("products", "POST", newItem)).status, 409);
    assert.equal(JSON.parse((await call("/api/admin/products?q=" + suggested)).text).total, 1);
    const newDetail = await call("/product/" + suggested);
    assert.match(newDetail.text, /רפידת בלם אישית לבדיקה/);
    assert.match(newDetail.text, /מותג \/ יצרן/);
    const newSearch = await call("/results?q=" + suggested);
    assert.match(newSearch.text, /רפידת בלם אישית לבדיקה/);
    const newSub = await call("/results?category=brakes&sub=pads");
    assert.match(newSub.text, /רפידת בלם אישית לבדיקה/);
    await call("/api/admin/promotions", "POST", {
      title: "מבצע אישי",
      targetType: "product",
      target: suggested,
      kind: "percent",
      value: 10,
      start: new Date(Date.now() - 60000).toISOString(),
      end: new Date(Date.now() + 86400000).toISOString(),
      badge: "מבצע מוצר אישי",
      homepage: false,
      enabled: true,
    });
    assert.equal(JSON.parse((await call("/api/admin/products/" + suggested)).text).price, 90);
    assert.match((await call("/product/" + suggested)).text, /מבצע מוצר אישי/);
    const customOrder = {
      requestId: randomUUID(),
      ref: "HZ-ORD-20261107-1415",
      customer: { name: "לקוח בדיקה", phone: "0501234567", plate: "12345678" },
      lines: [{ sku: suggested, qty: 2 }],
    };
    assert.equal((await raw("orders/capture", "POST", customOrder)).status, 201);
    const storedOrder = JSON.parse((await call("/api/admin/orders")).text).find(
      (o) => o.requestId === customOrder.requestId,
    );
    assert.equal(storedOrder.lines[0].price, 90);
    assert.equal(storedOrder.subtotal, 180);

    await call("/api/admin/products/" + suggested, "PATCH", {
      description: "תיאור אישי מעודכן",
      vehicleFitment: "התאמה מעודכנת",
      sub: "discs",
      inStock: false,
    });
    assert.match((await call("/product/" + suggested)).text, /אזל מהמלאי/);
    assert.equal(
      (await raw("orders/capture", "POST", { ...customOrder, requestId: randomUUID() })).status,
      422,
    );

    await call("/api/admin/products/" + suggested, "PATCH", { hidden: true });
    assert.equal((await app.fetch(new Request(origin + "/product/" + suggested))).status, 404);
    assert.equal(JSON.parse((await call("/api/admin/products/" + suggested)).text).hidden, true);
    const audits = JSON.parse((await call("/api/admin/audit")).text);
    assert.ok(
      audits.some(
        (a) => a.action === "product.create" && a.target === suggested && a.before === null,
      ),
    );
    const race = await Promise.all([
      raw("products", "POST", { ...newItem, sku: "HZ-TST-90001" }),
      raw("products", "POST", { ...newItem, sku: "HZ-TST-90001" }),
    ]);
    assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
    let staffLogin = await raw("login", "POST", {
      username: "preview-employee",
      password: process.env.ADMIN_READONLY_PASSWORD,
    });
    let staffCookie = staffLogin.headers.get("set-cookie").split(";")[0];
    assert.equal(
      (await raw("products", "POST", { ...newItem, sku: "HZ-TST-90002" }, staffCookie)).status,
      403,
    );
    assert.equal(
      (await raw("products/suggest-sku?category=brakes", "GET", undefined, staffCookie)).status,
      403,
    );
    await call("/api/admin/users", "POST", {
      id: "demo-employee",
      username: "preview-employee",
      name: "עובד בדיקה",
      role: "employee",
      active: true,
      permissions: ["products", "orders", "add-products"],
    });
    staffLogin = await raw("login", "POST", {
      username: "preview-employee",
      password: process.env.ADMIN_READONLY_PASSWORD,
    });
    staffCookie = staffLogin.headers.get("set-cookie").split(";")[0];
    assert.equal(
      (await raw("products", "POST", { ...newItem, sku: "HZ-TST-90002" }, staffCookie)).status,
      200,
    );
    assert.equal(
      (await raw("products/HZ-BRK-00001", "PATCH", { price: 1 }, staffCookie)).status,
      403,
    );
    await call("/api/admin/logout", "POST", {});
    const revoked = await app.fetch(
      new Request(origin + "/api/admin/session", { headers: { cookie } }),
    );
    assert.equal(revoked.status, 401);
    console.log("READONLY_RESULT=" + JSON.stringify({ statuses }));
  }
}
