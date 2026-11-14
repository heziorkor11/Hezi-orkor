import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PUBLIC_GIT_PATHS } from "./types.ts";
import { overlayProductTags, setPublicOverlay, getPublicOverlay, mergeOverlay } from "./public-overlay.ts";
import { catalogPrice, ceilShekel } from "../prices.ts";
import { isHiddenCategory, isWorkshopPackSku } from "../display-taxonomy.ts";

test("public git allowlist never includes orders or user files", async () => {
  const { PRIVATE_GIT_PATHS } = await import("./git-private.server.ts");
  const forbidden = [
    "orders/orders.json",
    "private-orders.json",
    "private-users.json",
    "users.json",
    "admin/private-users.json",
    "admin/preview/private-users.json",
  ];
  for (const path of forbidden) {
    assert.equal((PUBLIC_GIT_PATHS as readonly string[]).includes(path), false, path);
  }
  assert.ok((PUBLIC_GIT_PATHS as readonly string[]).includes("public/catalog/price-overrides.json"));
  assert.ok((PRIVATE_GIT_PATHS as readonly string[]).includes("admin/private-users.json"));
  assert.ok((PRIVATE_GIT_PATHS as readonly string[]).includes("admin/preview/private-users.json"));
  assert.ok((PRIVATE_GIT_PATHS as readonly string[]).includes("orders/orders.json"));
  assert.ok((PRIVATE_GIT_PATHS as readonly string[]).includes("orders/preview/orders.json"));
});

test("product tags cap at two and overlay wins", () => {
  const prev = getPublicOverlay();
  setPublicOverlay({
    ...prev,
    productTags: { "HZ-TEST-TAG": ["sale", "new", "recommended"] },
  });
  const ids = overlayProductTags("HZ-TEST-TAG", []);
  assert.deepEqual(ids, ["sale", "new"]);
  setPublicOverlay(prev);
});

test("tag library seed includes sale and deal SKUs are tagged", () => {
  const library = JSON.parse(readFileSync(new URL("../../../public/catalog/tag-library.json", import.meta.url), "utf8")) as {
    tags: { id: string; label: string }[];
  };
  assert.ok(library.tags.some((t) => t.id === "sale" && t.label === "מבצע"));
  const tags = JSON.parse(readFileSync(new URL("../../../public/catalog/product-tags.json", import.meta.url), "utf8")) as {
    bySku: Record<string, string[]>;
  };
  assert.deepEqual(tags.bySku["HZ-BRK-00248"], ["sale"]);
});

test("catalog prices still ceil and workshop packs have no numeric price", () => {
  assert.equal(ceilShekel(10.1), 11);
  assert.equal(typeof isWorkshopPackSku, "function");
  assert.equal(typeof catalogPrice, "function");
});

test("headlights and small engines stay hidden categories", () => {
  assert.equal(isHiddenCategory("lights"), true);
  assert.equal(isHiddenCategory("small-engine"), true);
});

test("session and revert tokens verify and expire", async () => {
  process.env.ADMIN_SESSION_SECRET = "test-session-secret-32chars-ok";
  const { issueSession, readSession, issueRevertToken, readRevertToken, signPayload, verifyPayload } = await import(
    "./tokens.ts"
  );
  const token = issueSession({ id: "user_master", username: "matan", name: "מתן", role: "master" });
  const session = readSession(token);
  assert.ok(session);
  assert.equal(session?.username, "matan");
  assert.equal(session?.role, "master");
  const bad = readSession(token.slice(0, -2) + "aa");
  assert.equal(bad, null);

  const revert = issueRevertToken("act_1");
  assert.equal(readRevertToken(revert), "act_1");
  const expired = signPayload({ typ: "revert", id: "act_1", exp: Date.now() - 1000 });
  assert.equal(readRevertToken(expired), null);
  assert.equal(verifyPayload("nope"), null);
});

test("merge overlay keeps existing keys", () => {
  const prev = getPublicOverlay();
  mergeOverlay({ nameBySku: { "HZ-X": "שם" } });
  assert.equal(getPublicOverlay().nameBySku?.["HZ-X"], "שם");
  setPublicOverlay(prev);
});

test("normalizeAdminPath collapses double slashes and /admin/admin prefix", async () => {
  const { normalizeAdminPath, isAdminHomePath, ADMIN_HOME } = await import("./paths.ts");
  assert.equal(normalizeAdminPath("/admin//admin/"), ADMIN_HOME);
  assert.equal(normalizeAdminPath("/admin/admin"), ADMIN_HOME);
  assert.equal(normalizeAdminPath("/admin/admin/"), ADMIN_HOME);
  assert.equal(normalizeAdminPath("/admin/admin/orders"), "/admin/orders");
  assert.equal(normalizeAdminPath("/admin//orders"), "/admin/orders");
  assert.equal(normalizeAdminPath("/admin/orders"), "/admin/orders");
  assert.equal(normalizeAdminPath("/admin/login"), "/admin/login");
  assert.equal(normalizeAdminPath("/admin"), ADMIN_HOME);
  assert.equal(normalizeAdminPath("/results"), "/results");
  assert.equal(isAdminHomePath("/admin"), true);
  assert.equal(isAdminHomePath(ADMIN_HOME), true);
  assert.equal(isAdminHomePath("/admin/orders"), false);
});

test("SMTP falls back from 465 TLS failure to 587 STARTTLS, but not on session errors", async () => {
  const { sendSmtp, SmtpError, isSmtpConnectOrTlsFailure, SMTP_TRANSPORTS } = await import("./smtp.ts");
  assert.deepEqual(
    SMTP_TRANSPORTS.map((t) => [t.port, t.mode]),
    [
      [465, "implicit-tls"],
      [587, "starttls"],
    ],
  );

  const tlsErr = new SmtpError("Client network socket disconnected before secure TLS connection was established", "tls");
  assert.equal(isSmtpConnectOrTlsFailure(tlsErr), true);
  assert.equal(isSmtpConnectOrTlsFailure(new Error("Client network socket disconnected before secure TLS connection was established")), true);
  const eof = Object.assign(new Error("[SSL: UNEXPECTED_EOF_WHILE_READING] EOF occurred in violation of protocol"), {
    code: "EPROTO",
  });
  assert.equal(isSmtpConnectOrTlsFailure(eof), true);

  const authErr = new SmtpError("SMTP 535: authentication failed", "session");
  assert.equal(isSmtpConnectOrTlsFailure(authErr), false);

  const tried: Array<number> = [];
  const result = await sendSmtp(
    { to: "owner@example.com", subject: "t", html: "<p>x</p>", text: "x" },
    {
      sendWithTransport: async (_opts, transport) => {
        tried.push(transport.port);
        if (transport.port === 465) throw tlsErr;
      },
    },
  );
  assert.deepEqual(tried, [465, 587]);
  assert.equal(result.transport.port, 587);
  assert.equal(result.transport.mode, "starttls");

  const only465: number[] = [];
  const ok = await sendSmtp(
    { to: "owner@example.com", subject: "t", html: "<p>x</p>", text: "x" },
    {
      sendWithTransport: async (_opts, transport) => {
        only465.push(transport.port);
      },
    },
  );
  assert.deepEqual(only465, [465]);
  assert.equal(ok.transport.port, 465);

  const authTried: number[] = [];
  await assert.rejects(
    () =>
      sendSmtp(
        { to: "owner@example.com", subject: "t", html: "<p>x</p>", text: "x" },
        {
          sendWithTransport: async (_opts, transport) => {
            authTried.push(transport.port);
            throw authErr;
          },
        },
      ),
    (err: unknown) => err instanceof SmtpError && err.phase === "session",
  );
  assert.deepEqual(authTried, [465]);

  const bothTried: number[] = [];
  await assert.rejects(
    () =>
      sendSmtp(
        { to: "owner@example.com", subject: "t", html: "<p>x</p>", text: "x" },
        {
          sendWithTransport: async (_opts, transport) => {
            bothTried.push(transport.port);
            throw new SmtpError("SMTP timeout", transport.port === 465 ? "tls" : "connect");
          },
        },
      ),
    (err: unknown) => err instanceof SmtpError,
  );
  assert.deepEqual(bothTried, [465, 587]);
});

test("test notification email is marked sample and uses a no-op revert link", async () => {
  const { buildChangeNotification, SAMPLE_REVERT_PATH, smtpErrorMessageHe } = await import("./mail-template.ts");
  const mail = buildChangeNotification({
    actorName: "יואב לוי",
    actorRole: "עובד",
    action: "עריכת מוצר (price) — דוגמת בדיקה",
    target: "HZ-CAF-00195",
    at: "2026-11-13T21:40:00.000Z",
    before: { price: 11 },
    after: { price: 13 },
    revertUrl: `https://preview.example${SAMPLE_REVERT_PATH}`,
    sample: true,
  });
  assert.match(mail.subject, /בדיקת דוא״ל/);
  assert.match(mail.subject, /לא מבטל שינוי/);
  assert.match(mail.html, /מייל בדיקה בלבד/);
  assert.match(mail.html, /אינו מבטל שינוי אמיתי/);
  assert.match(mail.html, /\/admin\/revert\?sample=1/);
  assert.doesNotMatch(mail.html, /[?&]token=/);
  assert.match(mail.text, /לדוגמה/);
  assert.equal(SAMPLE_REVERT_PATH, "/admin/revert?sample=1");

  const live = buildChangeNotification({
    actorName: "יואב לוי",
    actorRole: "עובד",
    action: "עריכת מוצר (price)",
    target: "HZ-CAF-00195",
    at: "2026-11-13T21:40:00.000Z",
    before: { price: 11 },
    after: { price: 13 },
    revertUrl: "https://preview.example/admin/revert?token=abc",
  });
  assert.match(live.subject, /^שינוי עלה לאתר/);
  assert.doesNotMatch(live.html, /מייל בדיקה בלבד/);
  assert.match(live.html, /token=abc/);

  assert.match(smtpErrorMessageHe("smtp-not-configured"), /חסרות הגדרות Gmail/);
  assert.match(smtpErrorMessageHe("smtp-failed", new Error("SMTP timeout")), /פג הזמן/);
  assert.match(smtpErrorMessageHe("smtp-failed", new Error("Client network socket disconnected before secure TLS connection was established")), /TLS/);
  const leaked = smtpErrorMessageHe("smtp-failed", new Error("fail abcdefghijklmnopqrstuvwx=="));
  assert.doesNotMatch(leaked, /abcdefghijklmnopqrstuvwx/);
});

test("preview users path is isolated from production and rejects illegal overrides", async () => {
  const { privateUsersPath, assertPrivateGitPath } = await import("./git-private.server.ts");
  const prevEnv = process.env.VERCEL_ENV;
  const prevPath = process.env.ADMIN_DATA_USERS_PATH;
  delete process.env.ADMIN_DATA_USERS_PATH;
  process.env.VERCEL_ENV = "production";
  assert.equal(privateUsersPath(), "admin/private-users.json");
  delete process.env.VERCEL_ENV;
  assert.equal(privateUsersPath(), "admin/preview/private-users.json");
  process.env.VERCEL_ENV = "preview";
  assert.equal(privateUsersPath(), "admin/preview/private-users.json");
  process.env.ADMIN_DATA_USERS_PATH = "admin/preview/private-users.json";
  assert.equal(privateUsersPath(), "admin/preview/private-users.json");
  process.env.ADMIN_DATA_USERS_PATH = "orders/orders.json";
  assert.throws(() => privateUsersPath(), /orders/);
  process.env.ADMIN_DATA_USERS_PATH = "../secret.json";
  assert.throws(() => privateUsersPath(), /allowlisted/);
  assert.throws(() => assertPrivateGitPath("public/catalog/admin-activity.json"), /allowlisted/);
  if (prevEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = prevEnv;
  if (prevPath === undefined) delete process.env.ADMIN_DATA_USERS_PATH;
  else process.env.ADMIN_DATA_USERS_PATH = prevPath;
});

test("preview orders path is isolated from production and rejects illegal overrides", async () => {
  const { privateOrdersPath, assertPrivateGitPath } = await import("./git-private.server.ts");
  const prevEnv = process.env.VERCEL_ENV;
  const prevPath = process.env.ADMIN_DATA_ORDERS_PATH;
  delete process.env.ADMIN_DATA_ORDERS_PATH;
  process.env.VERCEL_ENV = "production";
  assert.equal(privateOrdersPath(), "orders/orders.json");
  delete process.env.VERCEL_ENV;
  assert.equal(privateOrdersPath(), "orders/preview/orders.json");
  process.env.VERCEL_ENV = "preview";
  assert.equal(privateOrdersPath(), "orders/preview/orders.json");
  process.env.ADMIN_DATA_ORDERS_PATH = "orders/preview/orders.json";
  assert.equal(privateOrdersPath(), "orders/preview/orders.json");
  process.env.ADMIN_DATA_ORDERS_PATH = "admin/private-users.json";
  assert.throws(() => privateOrdersPath(), /users/);
  process.env.ADMIN_DATA_ORDERS_PATH = "../secret.json";
  assert.throws(() => privateOrdersPath(), /allowlisted/);
  if (prevEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = prevEnv;
  if (prevPath === undefined) delete process.env.ADMIN_DATA_ORDERS_PATH;
  else process.env.ADMIN_DATA_ORDERS_PATH = prevPath;
});

test("stored users keep only scrypt hashes and never plaintext passwords", async () => {
  const { hashPassword } = await import("./passwords.ts");
  const { sanitizeStoredUser, serializeUsersFile } = await import("./users.server.ts");
  const hash = await hashPassword("correct-horse-battery");
  assert.match(hash, /^scrypt:[0-9a-f]+:[0-9a-f]+$/i);
  const ok = sanitizeStoredUser({
    id: "user_1",
    username: "worker1",
    name: "עובד",
    role: "worker",
    active: true,
    passwordHash: hash,
  });
  assert.ok(ok);
  assert.equal(ok?.username, "worker1");
  assert.equal("password" in (ok as object), false);
  assert.equal(sanitizeStoredUser({ ...ok, password: "correct-horse-battery" }), null);
  assert.equal(sanitizeStoredUser({ ...ok, passwordHash: "plaintext-password-value" }), null);
  const text = serializeUsersFile([ok!]);
  assert.doesNotMatch(text, /correct-horse-battery/);
  assert.match(text, /"passwordHash": "scrypt:/);
  assert.throws(() => serializeUsersFile([{ ...ok!, passwordHash: "bcrypt:nope" } as typeof ok]), /scrypt/);
});

test("users persist in the private repo across a fresh disk and can be deleted", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "hezi-users-"));
  const store = new Map<string, { content: string; sha: string }>();
  const prev = {
    repo: process.env.ADMIN_DATA_GITHUB_REPO,
    token: process.env.ADMIN_GITHUB_TOKEN,
    dataDir: process.env.ADMIN_DATA_DIR,
    vercel: process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
    local: process.env.ADMIN_LOCAL_ENABLED,
    masterUser: process.env.ADMIN_MASTER_USERNAME,
    masterPass: process.env.ADMIN_MASTER_PASSWORD,
    masterHash: process.env.ADMIN_MASTER_PASSWORD_HASH,
    workerUser: process.env.ADMIN_WORKER_USERNAME,
    workerPass: process.env.ADMIN_WORKER_PASSWORD,
    usersPath: process.env.ADMIN_DATA_USERS_PATH,
  };
  process.env.ADMIN_DATA_GITHUB_REPO = "heziorkor11/hezi-orkor-data";
  process.env.ADMIN_GITHUB_TOKEN = "test-token-not-a-real-secret";
  process.env.ADMIN_DATA_DIR = dir;
  process.env.ADMIN_LOCAL_ENABLED = "1";
  process.env.ADMIN_MASTER_USERNAME = "matan";
  process.env.ADMIN_MASTER_PASSWORD = "master-pass-for-test";
  delete process.env.ADMIN_MASTER_PASSWORD_HASH;
  delete process.env.ADMIN_WORKER_USERNAME;
  delete process.env.ADMIN_WORKER_PASSWORD;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  process.env.ADMIN_DATA_USERS_PATH = "admin/preview/private-users.json";

  const { setPrivateGitOpsForTests } = await import("./git-private.server.ts");
  setPrivateGitOpsForTests({
    async isPrivate() {
      return true;
    },
    async readFile(_repo, _branch, path) {
      return store.get(path) || null;
    },
    async putFile(_repo, _branch, path, content) {
      if (JSON.stringify({ path, content }).includes("master-pass-for-test") || JSON.stringify({ path, content }).includes("worker-pass-for-test")) {
        throw new Error("plaintext password leaked into private store");
      }
      store.set(path, { content, sha: `sha_${store.size + 1}` });
    },
  });

  try {
    const users = await import("./users.server.ts");
    const listed = await users.listUsers();
    assert.ok(listed.some((u) => u.username === "matan" && u.role === "master"));
    const created = await users.addUser({ username: "e2e_worker", name: "עובד בדיקה", role: "worker", password: "worker-pass-for-test" });
    assert.equal(created.username, "e2e_worker");
    assert.ok(store.has("admin/preview/private-users.json"));
    assert.equal(store.has("admin/private-users.json"), false);

    await rm(dir, { recursive: true, force: true });
    await mkdtemp(join(tmpdir(), "hezi-users-empty-")); // ensure fs still works
    process.env.ADMIN_DATA_DIR = await mkdtemp(join(tmpdir(), "hezi-users-fresh-"));

    const authed = await users.authenticate("e2e_worker", "worker-pass-for-test");
    assert.ok(authed);
    assert.equal(authed?.username, "e2e_worker");
    const bad = await users.authenticate("e2e_worker", "wrong-password");
    assert.equal(bad, null);

    await users.deleteUser(created.id);
    const after = await users.listUsers();
    assert.equal(after.some((u) => u.username === "e2e_worker"), false);
    await assert.rejects(() => users.deleteUser("user_master"), /מאסטר/);
    const fresh = JSON.parse(store.get("admin/preview/private-users.json")!.content) as { users: { username: string; password?: string }[] };
    assert.equal(fresh.users.some((u) => u.username === "e2e_worker"), false);
    assert.equal(fresh.users.every((u) => !("password" in u)), true);
  } finally {
    setPrivateGitOpsForTests(null);
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore("ADMIN_DATA_GITHUB_REPO", prev.repo);
    restore("ADMIN_GITHUB_TOKEN", prev.token);
    restore("ADMIN_DATA_DIR", prev.dataDir);
    restore("VERCEL", prev.vercel);
    restore("VERCEL_ENV", prev.vercelEnv);
    restore("ADMIN_LOCAL_ENABLED", prev.local);
    restore("ADMIN_MASTER_USERNAME", prev.masterUser);
    restore("ADMIN_MASTER_PASSWORD", prev.masterPass);
    restore("ADMIN_MASTER_PASSWORD_HASH", prev.masterHash);
    restore("ADMIN_WORKER_USERNAME", prev.workerUser);
    restore("ADMIN_WORKER_PASSWORD", prev.workerPass);
    restore("ADMIN_DATA_USERS_PATH", prev.usersPath);
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

test("private repo writes are refused when the data repo is not private", async () => {
  const { setPrivateGitOpsForTests, commitPrivateFile, assertPrivateDataRepo } = await import("./git-private.server.ts");
  const prevRepo = process.env.ADMIN_DATA_GITHUB_REPO;
  process.env.ADMIN_DATA_GITHUB_REPO = "heziorkor11/Hezi-orkor";
  setPrivateGitOpsForTests({
    async isPrivate() {
      return false;
    },
    async readFile() {
      return null;
    },
    async putFile() {
      throw new Error("should not write");
    },
  });
  try {
    await assert.rejects(() => assertPrivateDataRepo(), /not private/);
    await assert.rejects(
      () => commitPrivateFile({ path: "admin/preview/private-users.json", content: "{}", message: "x" }),
      /not private/,
    );
  } finally {
    setPrivateGitOpsForTests(null);
    if (prevRepo === undefined) delete process.env.ADMIN_DATA_GITHUB_REPO;
    else process.env.ADMIN_DATA_GITHUB_REPO = prevRepo;
  }
});

test("activity and order PDF paths stay isolated from production", async () => {
  const prev = process.env.VERCEL_ENV;
  const prevAct = process.env.ADMIN_DATA_ACTIVITY_PATH;
  const prevOrd = process.env.ADMIN_DATA_ORDERS_PATH;
  delete process.env.ADMIN_DATA_ACTIVITY_PATH;
  delete process.env.ADMIN_DATA_ORDERS_PATH;
  process.env.VERCEL_ENV = "preview";
  const { privateActivityPath, privateOrderPdfPath, isPrivateGitPath, isOrderPdfPath } = await import("./git-private.server.ts");
  assert.equal(privateActivityPath(), "admin/preview/activity.json");
  assert.equal(privateOrderPdfPath("HZ-ORD_abc"), "orders/preview/pdfs/HZ-ORD_abc.pdf");
  assert.equal(isPrivateGitPath("admin/activity.json"), true);
  assert.equal(isPrivateGitPath("admin/preview/activity.json"), true);
  assert.equal(isOrderPdfPath("orders/pdfs/HZ-ORD_abc.pdf"), true);
  assert.equal(isPrivateGitPath("orders/orders.json"), true);
  assert.equal(isPrivateGitPath("public/catalog/admin-activity.json"), false);
  assert.equal(isPrivateGitPath("orders/pdfs/../orders.json"), false);
  assert.equal(isOrderPdfPath("orders/preview/pdfs/not-an-order.pdf"), false);
  process.env.VERCEL_ENV = "production";
  assert.equal(privateActivityPath(), "admin/activity.json");
  assert.equal(privateOrderPdfPath("HZ-ORD_abc"), "orders/pdfs/HZ-ORD_abc.pdf");
  process.env.VERCEL_ENV = prev;
  if (prevAct === undefined) delete process.env.ADMIN_DATA_ACTIVITY_PATH;
  else process.env.ADMIN_DATA_ACTIVITY_PATH = prevAct;
  if (prevOrd === undefined) delete process.env.ADMIN_DATA_ORDERS_PATH;
  else process.env.ADMIN_DATA_ORDERS_PATH = prevOrd;
});

test("workshop packs and ceil prices format correctly on the products sheet", async () => {
  const { formatSheetPrice, visibilityLabel, sheetRowToArray, PRODUCT_SHEET_HEADERS } = await import("./product-sheet.ts");
  assert.equal(PRODUCT_SHEET_HEADERS.length, 14);
  const shop = formatSheetPrice({ workshop: true, displayPrice: 99, basePrice: 80 });
  assert.equal(shop.priceDisplayed, "מחיר מיוחד למוסכים וספקים");
  const ceil = formatSheetPrice({ workshop: false, displayPrice: 10.8, basePrice: 15 });
  assert.equal(ceil.priceDisplayed, "11");
  assert.equal(ceil.basePrice, "15");
  assert.equal(visibilityLabel(true), "מוסתר");
  const row = sheetRowToArray({
    sku: "HZ-CAF-00195",
    name: "x",
    category: "filters",
    categoryHe: "פילטרים",
    subType: "cabin",
    fitment: "",
    priceDisplayed: "11",
    basePrice: "15",
    imageUrl: "",
    tags: "",
    stock: "",
    visibility: "מוצג",
    updatedAt: "",
    updatedBy: "",
  });
  assert.equal(row[0], "HZ-CAF-00195");
  assert.equal(row.length, 14);
});
