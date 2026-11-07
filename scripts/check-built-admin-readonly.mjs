/** Cold real-function tests: no network, filesystem writes restricted to /tmp. */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes, scryptSync } from "node:crypto";
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
    const products = await call("/api/admin/products?q=HZ-GEN-00266");
    assert.ok(JSON.parse(products.text).total > 0);
    await call("/api/admin/products/HZ-GEN-00266");
    await call("/api/admin/promotions");
    await call("/api/admin/promotions", "POST", {
      title: "בדיקת קטלוג ארוז",
      targetType: "product",
      target: "HZ-GEN-00266",
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
    await call("/api/admin/logout", "POST", {});
    const revoked = await app.fetch(
      new Request(origin + "/api/admin/session", { headers: { cookie } }),
    );
    assert.equal(revoked.status, 401);
    console.log("READONLY_RESULT=" + JSON.stringify({ statuses }));
  }
}
