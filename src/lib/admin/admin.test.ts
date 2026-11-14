import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PUBLIC_GIT_PATHS } from "./types.ts";
import { overlayProductTags, setPublicOverlay, getPublicOverlay, mergeOverlay } from "./public-overlay.ts";
import { catalogPrice, ceilShekel } from "../prices.ts";
import { isHiddenCategory, isWorkshopPackSku } from "../display-taxonomy.ts";

test("public git allowlist never includes orders or user files", () => {
  const forbidden = ["orders/orders.json", "private-orders.json", "private-users.json", "users.json"];
  for (const path of forbidden) {
    assert.equal((PUBLIC_GIT_PATHS as readonly string[]).includes(path), false, path);
  }
  assert.ok((PUBLIC_GIT_PATHS as readonly string[]).includes("public/catalog/price-overrides.json"));
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
