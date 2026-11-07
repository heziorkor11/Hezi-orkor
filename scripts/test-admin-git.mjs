import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";
import { fakeGitHub, configureGitTest } from "./git-storage-fixture.mjs";
// Load the real TypeScript adapter with built-in Node imports, without starting services.
const urls = new Map();
async function moduleUrl(file) {
  if (urls.has(file)) return urls.get(file);
  let code = ts.transpileModule(await readFile(file, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const match of [...code.matchAll(/from ["'](\.\/[^"']+)["']/g)]) {
    const dependency = await moduleUrl(resolve(file, "..", match[1] + ".ts"));
    code = code.replaceAll(JSON.stringify(match[1]), JSON.stringify(dependency));
  }
  const url = "data:text/javascript;base64," + Buffer.from(code).toString("base64");
  urls.set(file, url);
  return url;
}
configureGitTest();
const gh = fakeGitHub();
globalThis.fetch = gh.fetch;
const { GitHubAdminAdapter } = await import(
  await moduleUrl(resolve("src/lib/admin/git-storage.server.ts"))
);
const { initialAdminState } = await import(await moduleUrl(resolve("src/lib/admin/types.ts")));
class Temporary {
  state = initialAdminState();
  files = new Map();
  async read() {
    return structuredClone(this.state);
  }
  async transaction(change) {
    const result = await change(this.state);
    this.state.revision++;
    return result;
  }
  async putFile(bytes, extension) {
    const id = "00000000-0000-0000-0000-000000000000." + extension;
    this.files.set(id, bytes);
    return id;
  }
  async getFile(id) {
    return this.files.get(id);
  }
}
const temporary = new Temporary(),
  a = new GitHubAdminAdapter(temporary);
await a.transaction(() => {});
assert.equal(gh.writes.length, 0, "no-op must not redeploy");
await a.transaction((s) => {
  s.products.X = { name: "מוצר לדוגמה", price: 89, created: true, category: "additives" };
  s.users.push({
    id: "employee",
    username: "employee",
    name: "עובד",
    passwordHash: "sensitive-hash",
  });
  s.sessions.push({
    hash: "sensitive-session",
    userId: "employee",
    authVersion: "v1",
    expires: Date.now() + 1000,
  });
  s.home.categoryOrder = ["filters", "brakes"];
  s.promotions.push({ id: "promo" });
  s.audit.push({ action: "product.create", actor: "employee", before: null, after: { price: 89 } });
});
const cold = new GitHubAdminAdapter(new Temporary());
assert.equal((await cold.read()).products.X.price, 89);
assert.equal((await cold.read()).users[0].passwordHash, "sensitive-hash");
const clear = Buffer.from(gh.files.get("admin-data/state.json").content, "base64").toString();
assert.ok(!clear.includes("sensitive-hash") && !clear.includes("sensitive-session"));
const before = gh.writes.length;
await a.transaction((s) => {
  s.orders.push({ id: "order", customer: { phone: "050-example", name: "לקוח" } });
  s.audit.push({ action: "order.capture", after: { phone: "050-example" } });
  s.assets.push("private.pdf");
});
assert.equal(gh.writes.length, before, "public-repo orders do not trigger Git writes");
assert.equal((await a.read()).orders.length, 1);
assert.equal((await cold.read()).orders.length, 0);
assert.deepEqual(gh.decrypt().orders, []);
assert.ok(!JSON.stringify(gh.decrypt()).includes("050-example"));
const pdf = await a.putFile(new Uint8Array([1, 2]), "pdf");
assert.equal(gh.writes.length, before);
assert.deepEqual(await a.getFile(pdf), new Uint8Array([1, 2]));
const image = await a.putFile(new Uint8Array([3, 4]), "webp");
assert.deepEqual(await cold.getFile(image), new Uint8Array([3, 4]));
assert.ok(gh.writes.every((w) => !w.path.endsWith(".pdf")));
gh.conflicts = 1;
await a.transaction((s) => {
  s.products.X.price = 90;
});
assert.equal((await cold.read()).products.X.price, 90);
await Promise.all([
  a.transaction((s) => {
    s.products.A = { price: 1 };
  }),
  cold.transaction((s) => {
    s.products.B = { price: 2 };
  }),
]);
assert.ok(
  (await cold.read()).products.A && (await cold.read()).products.B,
  "concurrent edits retained",
);
assert.ok(
  !JSON.stringify(gh.decrypt()).includes("050-example"),
  "unrelated edits must never persist temporary customers",
);
gh.conflicts = 3;
await assert.rejects(
  a.transaction((s) => {
    s.products.X.price = 123;
  }),
  /conflicting/,
);
gh.conflicts = 0;
gh.private = true;
await a.transaction((s) => {
  s.orders.push({ id: "private-order", customer: { name: "דוגמה" } });
});
assert.equal((await cold.read()).orders.length, 1, "private repo orders persist encrypted");
gh.failVisibility = true;
await assert.rejects(a.read(), /visibility/);
gh.failVisibility = false;
process.env.ADMIN_GIT_ENCRYPTION_KEY = "ab".repeat(32);
await assert.rejects(new GitHubAdminAdapter(new Temporary()).read());
await assert.rejects(a.getFile("../state.json"));
const { adminRuntimeMode } = await import(await moduleUrl(resolve("src/lib/admin/config.ts")));
assert.equal(adminRuntimeMode(), "git");
process.env.ADMIN_GITHUB_BRANCH = "main";
assert.equal(adminRuntimeMode(), "disabled", "preview must not write production branch");
process.env.ADMIN_GITHUB_BRANCH = "feature/admin-dashboard";
process.env.ADMIN_STORAGE = "ephemeral";
process.env.ADMIN_PREVIEW_DEMO = "1";
assert.equal(adminRuntimeMode(), "preview-demo");
process.env.VERCEL_ENV = "production";
assert.equal(adminRuntimeMode(), "disabled", "production must never enable ephemeral preview mode");
console.log(
  "PASS Git storage: encrypted users/sessions, durable products/prices/promos/home/audit/media, cold reads, no-op suppression, CAS retries/concurrency, public-order/PDF exclusion, private orders, privacy/key failures. No live API calls.",
);
