/** Exercise the actual emitted Vercel/Nitro handler, not Vite's development transformer. */
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import assert from "node:assert/strict";
const output = resolve(process.env.ADMIN_TEST_OUTPUT || ".data/admin-test-results");
await mkdir(output, { recursive: true });
const fn = resolve(".vercel/output/functions/__server.func");
const paths = (await readdir(fn + "/_ssr")).filter(
  (p) => p.startsWith("router-") && p.endsWith(".mjs"),
);
for (const name of [...paths].reverse()) {
  const r = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `await import(${JSON.stringify(pathToFileURL(fn + "/_ssr/" + name).href)})`,
    ],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, `Cold import failed for ${name}: ${r.stderr}`);
}
const password = randomBytes(24).toString("base64url");
const salt = randomBytes(16).toString("hex");
const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
Object.assign(process.env, {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "feature/admin-dashboard",
  VERCEL_DEPLOYMENT_ID: "built-smoke-" + randomBytes(8).toString("hex"),
  VERCEL_URL: "preview-smoke.vercel.app",
  ADMIN_PREVIEW_DEMO: "1",
  ADMIN_STORAGE: "ephemeral",
  ADMIN_OWNER_USERNAME: "preview-owner",
  ADMIN_OWNER_PASSWORD_HASH: hash,
  ADMIN_EMPLOYEE_USERNAME: "preview-employee",
  ADMIN_EMPLOYEE_PASSWORD_HASH: hash,
});
const app = (await import(pathToFileURL(fn + "/index.mjs").href)).default;
const origin = "https://preview-smoke.vercel.app";
const request = (path, method = "GET", body, cookie) =>
  new Request(origin + path, {
    method,
    headers: {
      ...(body ? { origin, "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
const htmlResponse = await app.fetch(request("/admin"));
const html = await htmlResponse.text();
await writeFile(output + "/built-admin.html", html);
assert.equal(htmlResponse.status, 200, html.slice(0, 200));
assert.match(html, /כניסה לניהול/);
assert.match(html, /type="password"/);
assert.match(html, /מצב בדיקה/);
const login = await app.fetch(
  request("/api/admin/login", "POST", { username: "preview-owner", password }),
);
const data = await login.json();
assert.equal(login.status, 200, JSON.stringify(data));
assert.equal(data.user.role, "owner");
const cookie = login.headers.get("set-cookie").split(";")[0];
const session = await app.fetch(request("/api/admin/session", "GET", undefined, cookie));
assert.equal(session.status, 200);
assert.equal((await session.json()).user.role, "owner");
const storefront = await app.fetch(request("/api/admin/storefront"));
assert.equal((await storefront.json()).mode, "preview-demo");
const result = {
  passed: true,
  coldImportedRouterChunks: paths,
  adminStatus: htmlResponse.status,
  loginStatus: login.status,
  sessionStatus: session.status,
  realEmittedVercelHandler: true,
};
await writeFile(output + "/built-server-test.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
