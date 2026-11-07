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
      "x-vercel-forwarded-for": "192.0.2.10",
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
assert.match(html, /data-admin-route/);
assert.doesNotMatch(html, /data-storefront-whatsapp/);
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
// HTML checkpoint responses must not leak SyntaxError or HTML into the UI.
const ts = await import("typescript");
const { readFile } = await import("node:fs/promises");
let clientSource = await readFile("src/lib/admin/client.ts", "utf8");
clientSource = clientSource.replace(
  'import { adminSnapshot, publishAdminMutation } from "./overlay";',
  "const adminSnapshot = () => ({enabled:false}); const publishAdminMutation = (path) => { globalThis.__testMutationPath = path; };",
);
const clientJs = ts.default.transpileModule(clientSource, {
  compilerOptions: { target: ts.default.ScriptTarget.ES2022, module: ts.default.ModuleKind.ESNext },
}).outputText;
const { adminRequest, AdminRequestError } = await import(
  "data:text/javascript;base64," + Buffer.from(clientJs).toString("base64")
);
const realFetch = globalThis.fetch;
try {
  for (const status of [429, 403, 503, 200]) {
    globalThis.fetch = async () =>
      new Response("<html>Vercel Security Checkpoint</html>", {
        status,
        headers: { "content-type": "text/html" },
      });
    await assert.rejects(
      adminRequest("login", "POST", {}),
      (error) => !error.message.includes("JSON") && /בדיקת אבטחה/.test(error.message),
    );
  }
  globalThis.fetch = async () =>
    Response.json(
      { error: "יותר מדי ניסיונות. נסו שוב בעוד 30 שניות" },
      { status: 429, headers: { "x-admin-error": "rate-limit" } },
    );
  await assert.rejects(adminRequest("login", "POST", {}), /30 שניות/);
  globalThis.fetch = async () =>
    Response.json(
      {
        error: "בדקו את השדות המסומנים",
        fieldErrors: { name: "שם המוצר חייב להכיל לפחות 2 תווים" },
      },
      { status: 422 },
    );
  await assert.rejects(
    adminRequest("products", "POST", {}),
    (e) => e instanceof AdminRequestError && e.status === 422 && /2 תווים/.test(e.fieldErrors.name),
  );
  globalThis.fetch = async () => Response.json({ user: { role: "owner" } });
  assert.equal((await adminRequest("login", "POST", {})).user.role, "owner");
  globalThis.fetch = async () =>
    Response.json({
      result: { price: 818 },
      storefront: {
        enabled: true,
        mode: "preview-demo",
        revision: 1,
        products: {},
        promotions: [],
        home: {},
      },
    });
  const edited = await adminRequest("products/HZ-BRK-00001", "PATCH", { price: 818 });
  assert.equal(edited.price, 818);
  assert.equal(
    Object.hasOwn(edited, "storefront"),
    false,
    "Edit forms never receive receipt metadata as entity fields",
  );
  globalThis.fetch = async () =>
    Response.json({
      result: { sku: "HZ-TST-90003" },
      storefront: {
        enabled: true,
        mode: "preview-demo",
        revision: 3,
        products: {},
        promotions: [],
        home: {},
      },
    });
  assert.equal((await adminRequest("products", "POST", {})).sku, "HZ-TST-90003");
  assert.equal(globalThis.__testMutationPath, "products/HZ-TST-90003");
} finally {
  globalThis.fetch = realFetch;
}
// Repeated successful logins reset only the username+IP attempt bucket.
for (let i = 0; i < 11; i++) {
  const r = await app.fetch(
    request("/api/admin/login", "POST", { username: "preview-owner", password }),
  );
  assert.equal(r.status, 200);
}
for (let i = 0; i < 10; i++) {
  const r = await app.fetch(
    request("/api/admin/login", "POST", { username: "preview-owner", password: "wrong" }),
  );
  assert.equal(r.status, 401);
}
const throttled = await app.fetch(
  request("/api/admin/login", "POST", { username: "preview-owner", password }),
);
assert.equal(throttled.status, 429);
assert.equal(throttled.headers.get("x-admin-error"), "rate-limit");
assert.ok(Number(throttled.headers.get("retry-after")) <= 60);
assert.match((await throttled.json()).error, /שניות/);
const otherIp = request("/api/admin/login", "POST", { username: "preview-owner", password });
otherIp.headers.set("x-vercel-forwarded-for", "192.0.2.11");
assert.equal((await app.fetch(otherIp)).status, 200);
assert.equal(
  (await app.fetch(request("/api/admin/login", "POST", { username: "preview-employee", password })))
    .status,
  200,
);
const realNow = Date.now;
try {
  const now = realNow();
  Date.now = () => now + 61_000;
  assert.equal(
    (await app.fetch(request("/api/admin/login", "POST", { username: "preview-owner", password })))
      .status,
    200,
  );
} finally {
  Date.now = realNow;
}
const focusSource = await readFile("src/lib/admin/form-errors.ts", "utf8");
const focusJs = ts.default.transpileModule(focusSource, {
  compilerOptions: { target: ts.default.ScriptTarget.ES2022, module: ts.default.ModuleKind.ESNext },
}).outputText;
const { focusFirstInvalidField } = await import(
  "data:text/javascript;base64," + Buffer.from(focusJs).toString("base64")
);
const actions = [];
const elements = ["name", "sku"].map((name) => ({
  name,
  scrollIntoView: (opts) => actions.push([name, "scroll", opts.block]),
  focus: (opts) => actions.push([name, "focus", opts.preventScroll]),
}));
focusFirstInvalidField({ querySelectorAll: () => elements }, { sku: "reserved", name: "short" });
assert.deepEqual(actions, [
  ["name", "scroll", "center"],
  ["name", "focus", true],
]);
focusFirstInvalidField(null, {});
const result = {
  passed: true,
  typedHebrewFieldErrors: true,
  firstInvalidFieldScrollAndFocus: true,
  checkpointErrorUi: true,
  previewLoginThrottleAndSuccessReset: true,
  usernameAndIpIsolation: true,
  adminWithoutStorefrontBubble: true,
  coldImportedRouterChunks: paths,
  adminStatus: htmlResponse.status,
  loginStatus: login.status,
  sessionStatus: session.status,
  realEmittedVercelHandler: true,
};
await writeFile(output + "/built-server-test.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
