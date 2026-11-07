import { adminRuntimeMode, adminRequestHostAllowed } from "./config";
import {
  createHmac,
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import { adminStorage, adminServerEnabled } from "./storage.server";
import {
  safeUser,
  toPublicState,
  emptyPublicState,
  PERMISSIONS,
  type AdminState,
  type AdminUser,
  type Permission,
  type AuditEntry,
  type StoredOrder,
} from "./types";
import { explicitBrand, effectivePrice } from "./overlay";
import tax from "../../../public/catalog/display-taxonomy.json";
import rawPrices from "../../../public/catalog/prices.json";
import priceHides from "../../../public/catalog/price-hide-overrides.json";
import { loadBaseProductImpl as loadProductImpl } from "../catalog-listing";
import { catalogJson } from "../catalog-io";
import type { SearchHit } from "../catalog-types";
const categories = new Set(tax.categories.map((c) => c.id));
const hiddenPrices = new Set(priceHides.skus);
const basePrices = rawPrices as Record<string, number>;
const HOUR = 3_600_000;
const COOKIE = "hezi_admin";
class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}
function assert(ok: unknown, status: number, message: string): asserts ok {
  if (!ok) throw new ApiError(status, message);
}
function passwordHash(p: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(p, salt, 64).toString("hex")}`;
}
function checkPassword(p: string, h: string) {
  const m = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(h);
  if (!m) return false;
  return timingSafeEqual(scryptSync(p, m[1], 64), Buffer.from(m[2], "hex"));
}
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
function authVersion(u: AdminUser) {
  return `${u.version}:${u.role === "owner" ? digest(process.env.ADMIN_OWNER_PASSWORD_HASH || "") : ""}`;
}
function cookie(req: Request) {
  return (
    req.headers
      .get("cookie")
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(COOKIE + "="))
      ?.slice(COOKIE.length + 1) || ""
  );
}
function can(u: AdminUser, p: Permission) {
  return u.role === "owner" || u.permissions.includes(p);
}
function requirePermission(u: AdminUser, p: Permission) {
  assert(can(u, p), 403, "אין לך הרשאה לפעולה הזו");
}
function audit(
  s: AdminState,
  u: Pick<AdminUser, "username">,
  action: string,
  target: string,
  before: unknown,
  after: unknown,
) {
  const a: AuditEntry = {
    id: randomUUID(),
    at: new Date().toISOString(),
    actor: u.username,
    action,
    target,
    before,
    after,
  };
  s.audit.push(a);
}
const counters = new Map<string, { count: number; until: number }>();
function limit(key: string, max: number, ms: number) {
  const now = Date.now();
  for (const [k, v] of counters) if (v.until < now) counters.delete(k);
  const c = counters.get(key) || { count: 0, until: now + ms };
  c.count++;
  counters.set(key, c);
  if (c.count > max) {
    throw new ApiError(
      429,
      "יותר מדי ניסיונות. נסו שוב בעוד " +
        Math.max(1, Math.ceil((c.until - now) / 1000)) +
        " שניות",
      Math.max(1, Math.ceil((c.until - now) / 1000)),
    );
  }
}
async function bootstrap() {
  const storage = adminStorage();
  const state = await storage.read();
  if (state.users.length) return;
  const hash = process.env.ADMIN_OWNER_PASSWORD_HASH || "";
  assert(
    /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash),
    503,
    "ניהול דורש הגדרת ADMIN_OWNER_PASSWORD_HASH",
  );
  const demo = adminRuntimeMode() === "preview-demo";
  const employeeHash = process.env.ADMIN_EMPLOYEE_PASSWORD_HASH || "";
  if (demo)
    assert(
      /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(employeeHash),
      503,
      "מצב בדיקה דורש hash לעובד",
    );
  await storage.transaction((s) => {
    if (s.users.length) return;
    s.users.push({
      id: "local-owner",
      username: process.env.ADMIN_OWNER_USERNAME || "owner",
      name: "מתן",
      role: "owner",
      permissions: [...PERMISSIONS],
      active: true,
      version: 1,
      passwordHash: "",
    });
    if (demo)
      s.users.push({
        id: "demo-employee",
        username: process.env.ADMIN_EMPLOYEE_USERNAME || "preview-employee",
        name: "עובד בדיקה",
        role: "employee",
        permissions: ["products", "orders"],
        active: true,
        version: 1,
        passwordHash: employeeHash,
      });
  });
}
// Preview has no durable/shared session store. Authenticate a deployment-scoped,
// signed demo cookie across cold instances, still checking active user/version.
// Local/production-policy sessions remain server-side and unchanged.
const demoRevocations = new Map<string, number>();
function demoKey() {
  return createHmac("sha256", process.env.ADMIN_OWNER_PASSWORD_HASH || "")
    .update(
      "hezi-admin-preview:" +
        (process.env.VERCEL_URL || "") +
        ":" +
        (process.env.ADMIN_EMPLOYEE_PASSWORD_HASH || ""),
    )
    .digest();
}
function demoToken(user: AdminUser) {
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      version: authVersion(user),
      expires: Date.now() + 8 * HOUR,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");
  return "demo." + payload + "." + createHmac("sha256", demoKey()).update(payload).digest("hex");
}
function demoIdentity(token: string) {
  const [, payload, mac] = token.split(".");
  if (!token.startsWith("demo.") || !payload || !/^[a-f0-9]{64}$/.test(mac || "")) return null;
  const expected = createHmac("sha256", demoKey()).update(payload).digest();
  if (!timingSafeEqual(expected, Buffer.from(mac, "hex"))) return null;
  try {
    const claim = JSON.parse(Buffer.from(payload, "base64url").toString());
    for (const [key, until] of demoRevocations)
      if (until <= Date.now()) demoRevocations.delete(key);
    if (
      !Number.isFinite(claim.expires) ||
      claim.expires <= Date.now() ||
      demoRevocations.has(digest(token))
    )
      return null;
    return claim;
  } catch {
    return null;
  }
}
function authenticated(req: Request, s: AdminState) {
  const token = cookie(req);
  if (adminRuntimeMode() === "preview-demo") {
    const claim = demoIdentity(token);
    const u = s.users.find((u) => u.id === claim?.userId && u.active);
    assert(u && claim && claim.version === authVersion(u), 401, "יש להתחבר לניהול");
    return u;
  }
  const sess = s.sessions.find((x) => x.hash === digest(token) && x.expires > Date.now());
  const u = s.users.find((u) => u.id === sess?.userId && u.active);
  assert(token && sess && u && sess.authVersion === authVersion(u), 401, "יש להתחבר לניהול");
  return u;
}
const cleanText = (max: number) => z.string().trim().min(1).max(max);
const patchSchema = z
  .object({
    name: cleanText(300).optional(),
    category: z
      .string()
      .refine((c) => categories.has(c))
      .optional(),
    price: z.number().positive().max(1_000_000).nullable().optional(),
    hidden: z.boolean().optional(),
    brand: z.string().trim().max(60).optional(),
  })
  .strict();
const promoSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: cleanText(100),
    targetType: z.enum(["product", "category", "brand"]),
    target: cleanText(100),
    kind: z.enum(["percent", "fixed"]),
    value: z.number().positive().max(1_000_000),
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
    badge: cleanText(40),
    homepage: z.boolean(),
    enabled: z.boolean(),
  })
  .strict()
  .refine(
    (p) => Date.parse(p.end) > Date.parse(p.start) && (p.kind !== "percent" || p.value < 100),
    { message: "טווח תאריכים או גובה הנחה לא תקינים" },
  );
const homeSchema = z
  .object({
    banners: z
      .array(
        z
          .object({
            id: cleanText(60),
            title: cleanText(100),
            text: z.string().max(250),
            href: z
              .string()
              .max(500)
              .refine(
                (h) =>
                  /^\/(?!\/)/.test(h) &&
                  !Array.from(h).some(
                    (c) => c.charCodeAt(0) <= 32 || c === String.fromCharCode(92),
                  ),
              ),
            image: z
              .string()
              .regex(/^\/api\/admin\/media\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/)
              .optional(),
            enabled: z.boolean(),
          })
          .strict(),
      )
      .max(5),
    featuredSkus: z
      .array(z.string().regex(/^HZ-[A-Z]+-\d{5}$/))
      .max(24)
      .optional(),
    categoryOrder: z.array(z.string().refine((c) => categories.has(c))).max(30),
  })
  .strict();
const userSchema = z
  .object({
    id: z.string().optional(),
    username: z.string().regex(/^[a-zA-Z0-9_-]{3,40}$/),
    name: cleanText(80),
    role: z.enum(["owner", "employee"]),
    permissions: z.array(z.enum(PERMISSIONS)).max(5),
    active: z.boolean(),
    password: z.string().min(12).max(128).optional(),
  })
  .strict()
  .refine((u) => !u.permissions.includes("prices") || u.permissions.includes("products"), {
    message: "הרשאת מחירים דורשת גם הרשאת עריכת מוצרים",
  });
const customerSchema = z
  .object({
    name: cleanText(100),
    phone: z.string().regex(/^(?:\+?972|0)[0-9 -]{8,16}$/),
    plate: z
      .string()
      .transform((s) => s.replace(/\D/g, ""))
      .refine((s) => /^\d{7,8}$/.test(s)),
    city: z.string().max(100).optional(),
    make: z.string().max(60).optional(),
    model: z.string().max(80).optional(),
    year: z.string().max(10).optional(),
    engine: z.string().max(60).optional(),
    delivery: z.string().max(30).optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();
const orderSchema = z
  .object({
    requestId: z.string().uuid(),
    ref: z.string().regex(/^HZ-ORD-\d{8}-\d{4}$/),
    customer: customerSchema,
    lines: z
      .array(
        z
          .object({
            sku: z.string().regex(/^HZ-[A-Z]+-\d{5}$/),
            qty: z.number().int().min(1).max(999),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    pdfBase64: z.string().max(2_800_000).optional(),
  })
  .strict();
async function body(req: Request) {
  assert(Number(req.headers.get("content-length") || 0) < 3_000_000, 413, "הקובץ גדול מדי");
  const text = await req.text();
  assert(Buffer.byteLength(text) < 3_000_000, 413, "הבקשה גדולה מדי");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "JSON לא תקין");
  }
}
function imageBytes(base64: string) {
  assert(/^[A-Za-z0-9+/=]+$/.test(base64), 422, "קובץ תמונה לא תקין");
  const b = Buffer.from(base64, "base64");
  assert(b.length > 16 && b.length <= 2_000_000, 413, "תמונה עד 2MB");
  const ext =
    b[0] === 255 && b[1] === 216 && b[2] === 255
      ? "jpg"
      : b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? "png"
        : b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP"
          ? "webp"
          : "";
  assert(ext, 422, "מותר להעלות JPEG, PNG או WebP בלבד");
  return { bytes: b, ext };
}
function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}
async function productForAdmin(sku: string, s: AdminState) {
  const p = await loadProductImpl(sku);
  if (!p) return undefined;
  const o = s.products[sku] || {};
  const base = hiddenPrices.has(sku) ? null : basePrices[sku] || null;
  const cat = o.category || p.category;
  const b = o.brand ?? explicitBrand(p.name);
  const price = hiddenPrices.has(sku)
    ? { price: null, regular: null, promo: undefined }
    : effectivePrice(sku, base, cat, b, toPublicState(s));
  return {
    ...p,
    ...o,
    category: cat,
    brand: b,
    price: price.price,
    regularPrice: price.regular,
    basePrice: base,
    hidden: !!o.hidden,
    priceProtected: hiddenPrices.has(sku),
  };
}
export async function adminApi(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/admin\/?/, "");
    const host = url.hostname;
    if (path === "storefront" && req.method === "GET" && !adminServerEnabled())
      return json(emptyPublicState());
    assert(
      adminServerEnabled() && adminRequestHostAllowed(host),
      503,
      "הניהול המקומי כבוי. אחסון ואימות לפרודקשן דורשים אישור נפרד.",
    );
    const storage = adminStorage();
    if (!["GET", "HEAD"].includes(req.method)) {
      assert(req.headers.get("origin") === url.origin, 403, "בקשה ממקור לא מורשה");
      assert(req.headers.get("content-type")?.startsWith("application/json"), 415, "נדרש JSON");
    }
    if (path === "storefront" && req.method === "GET")
      return json(
        toPublicState(
          await storage.read(),
          adminRuntimeMode() === "preview-demo" ? "preview-demo" : "local",
        ),
      );
    if (path.startsWith("media/") && req.method === "GET") {
      const id = path.slice(6);
      assert(!id.endsWith(".pdf"), 404, "לא נמצא");
      const s = await storage.read();
      assert(
        Object.values(s.products).some((p) => p.image === `/api/admin/media/${id}`) ||
          (s.assets || []).includes(id),
        404,
        "לא נמצא",
      );
      const b = await storage.getFile(id);
      const ext = id.split(".").pop();
      return new Response(new Uint8Array(b), {
        headers: {
          "content-type": ext === "jpg" ? "image/jpeg" : `image/${ext}`,
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
      });
    }
    if (path === "orders/capture" && req.method === "POST") {
      limit("capture", 30, HOUR);
      const input = orderSchema.parse(await body(req));
      const state = await storage.read();
      if (state.orders.some((o) => o.requestId === input.requestId))
        return json({ recorded: true });
      const lines: StoredOrder["lines"] = [];
      for (const line of input.lines) {
        const p = await productForAdmin(line.sku, state);
        assert(p && !state.products[line.sku]?.hidden, 422, "פריט לא זמין");
        lines.push({
          sku: p.sku,
          name: p.name,
          qty: line.qty,
          price: p.price,
          total: p.price == null ? null : Math.round(p.price * line.qty * 100) / 100,
        });
      }
      let pdfFile: string | undefined;
      if (input.pdfBase64) {
        const b = Buffer.from(input.pdfBase64, "base64");
        assert(
          b.length <= 2_000_000 && b.subarray(0, 5).toString() === "%PDF-",
          422,
          "PDF לא תקין",
        );
        pdfFile = await storage.putFile(b, "pdf");
      }
      await storage.transaction((s) => {
        if (s.orders.some((o) => o.requestId === input.requestId)) return;
        const order = {
          id: randomUUID(),
          requestId: input.requestId,
          ref: input.ref,
          createdAt: new Date().toISOString(),
          status: "waiting" as const,
          customer: input.customer,
          lines,
          subtotal: Math.round(lines.reduce((a, l) => a + (l.total || 0), 0) * 100) / 100,
          quoteCount: lines.filter((l) => l.price == null).length,
          pdfFile,
          source: "pdf-share-attempt" as const,
        };
        s.orders.push(order);
        audit(s, { username: "customer" }, "order.capture", order.id, null, {
          ref: order.ref,
          status: order.status,
        });
      });
      return json({ recorded: true }, 201);
    }
    await bootstrap();
    let state = await storage.read();
    if (path === "login" && req.method === "POST") {
      const input = z
        .object({ username: cleanText(40), password: z.string().min(1).max(128) })
        .strict()
        .parse(await body(req));
      // Only this guarded demo branch gets the short QA window. Keep the
      // existing non-preview policy intact. Never count GET/curl page loads.
      const preview = adminRuntimeMode() === "preview-demo";
      const ip = (
        req.headers.get("x-vercel-forwarded-for") ||
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown"
      )
        .split(",")[0]
        .trim();
      const loginKey = preview
        ? "preview-login:" + digest(input.username.toLowerCase() + ":" + ip)
        : "login:" + input.username;
      if (preview) {
        limit("preview-ip:" + digest(ip), 60, 60_000);
        limit(loginKey, 10, 60_000);
      } else {
        limit("all-logins", 60, 15 * 60_000);
        limit(loginKey, 10, 15 * 60_000);
      }
      const user = state.users.find((u) => u.username === input.username && u.active);
      const hash =
        user?.role === "owner"
          ? process.env.ADMIN_OWNER_PASSWORD_HASH || ""
          : user?.passwordHash || "";
      // Always run scrypt, including unknown users, to avoid username timing probes.
      const dummy = "scrypt:" + "0".repeat(32) + ":" + "0".repeat(128);
      const valid = checkPassword(input.password, hash || dummy);
      assert(user && valid, 401, "פרטי התחברות שגויים");
      if (preview) counters.delete(loginKey);
      const token = preview ? demoToken(user) : randomBytes(32).toString("hex");
      await storage.transaction((s) => {
        s.sessions = s.sessions.filter((x) => x.expires > Date.now());
        s.sessions.push({
          hash: digest(token),
          userId: user.id,
          authVersion: authVersion(user),
          expires: Date.now() + 8 * HOUR,
        });
        audit(s, user, "auth.login", user.id, null, { role: user.role });
      });
      return json({ user: safeUser(user) }, 200, {
        "set-cookie": `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=28800${url.protocol === "https:" ? "; Secure" : ""}`,
      });
    }
    const user = authenticated(req, state);
    if (path === "session" && req.method === "GET") return json({ user: safeUser(user) });
    if (path === "logout" && req.method === "POST") {
      if (adminRuntimeMode() === "preview-demo")
        demoRevocations.set(digest(cookie(req)), Date.now() + 8 * HOUR);
      await storage.transaction((s) => {
        s.sessions = s.sessions.filter((x) => x.hash !== digest(cookie(req)));
      });
      return json({ ok: true }, 200, {
        "set-cookie": `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0`,
      });
    }
    if (path === "dashboard" && req.method === "GET") {
      const hits = await catalogJson<SearchHit[]>("search-index.json");
      const visible = hits.filter(
        (p) =>
          !(tax.bySku as Record<string, { hidden?: boolean }>)[p.sku]?.hidden &&
          !state.products[p.sku]?.hidden,
      );
      const products = [];
      for (const p of visible) products.push(await productForAdmin(p.sku, state));
      return json({
        waiting: can(user, "orders")
          ? state.orders.filter((o) => o.status === "waiting").length
          : null,
        missingImages: products.filter((p) => !p?.image).length,
        missingPrices: products.filter((p) => p?.price == null).length,
        activePromotions: state.promotions.filter(
          (p) => p.enabled && Date.parse(p.start) <= Date.now() && Date.parse(p.end) > Date.now(),
        ).length,
        products: visible.length,
        recentAudit: user.role === "owner" ? state.audit.slice(-8).reverse() : [],
      });
    }
    if (path === "products" && req.method === "GET") {
      requirePermission(user, "products");
      const q = (url.searchParams.get("q") || "").trim().toLowerCase();
      const filter = url.searchParams.get("filter");
      const index = await catalogJson<SearchHit[]>("search-index.json");
      let hits = index.filter(
        (h) =>
          !(tax.bySku as Record<string, { hidden?: boolean }>)[h.sku]?.hidden &&
          (!q ||
            [h.sku, state.products[h.sku]?.name || h.title, h.oe]
              .join(" ")
              .toLowerCase()
              .includes(q) ||
            (q.replace(/[^a-z0-9]/g, "").length >= 5 &&
              [h.sku, h.oe]
                .join("")
                .replace(/[^a-z0-9]/gi, "")
                .toLowerCase()
                .includes(q.replace(/[^a-z0-9]/g, "")))),
      );
      if (filter === "hidden") hits = hits.filter((h) => state.products[h.sku]?.hidden);
      const page = Math.max(1, Math.min(1000, Number(url.searchParams.get("page")) || 1));
      const rows: (SearchHit | undefined)[] = [];
      for (const h of hits) {
        if (filter === "no-image" || filter === "no-price") {
          const p = await productForAdmin(h.sku, state);
          rows.push(
            (filter === "no-image" && !p?.image) || (filter === "no-price" && p?.price == null)
              ? h
              : undefined,
          );
        } else rows.push(h);
      }
      hits = rows.filter((h): h is SearchHit => !!h);
      const items = await Promise.all(
        hits.slice((page - 1) * 20, page * 20).map((h) => productForAdmin(h.sku, state)),
      );
      return json({ items, total: hits.length, page, pages: Math.ceil(hits.length / 20) });
    }
    if (path.startsWith("products/")) {
      requirePermission(user, "products");
      const parts = path.split("/");
      const sku = parts[1];
      const product = await productForAdmin(sku, state);
      assert(product, 404, "המוצר לא נמצא");
      if (parts.length === 2 && req.method === "GET") return json(product);
      if (parts[2] === "image" && req.method === "POST") {
        const input = z
          .object({ base64: z.string().max(2_800_000) })
          .strict()
          .parse(await body(req));
        const image = imageBytes(input.base64);
        const file = await storage.putFile(image.bytes, image.ext);
        await storage.transaction((s) => {
          const current = authenticated(req, s);
          requirePermission(current, "products");
          const before = s.products[sku] || {};
          s.products[sku] = { ...before, image: `/api/admin/media/${file}` };
          audit(
            s,
            current,
            "product.image",
            sku,
            { image: before.image || product.image },
            { image: s.products[sku].image },
          );
        });
        return json({ image: `/api/admin/media/${file}` });
      }
      if (parts.length === 2 && req.method === "PATCH") {
        const input = patchSchema.parse(await body(req));
        if (Object.hasOwn(input, "price")) {
          requirePermission(user, "prices");
          assert(
            !hiddenPrices.has(sku),
            422,
            "מחיר המוצר מוגן בהחרגה קיימת; אין לשנותו בלי בדיקה נפרדת",
          );
        }
        await storage.transaction((s) => {
          const current = authenticated(req, s);
          requirePermission(current, "products");
          if (Object.hasOwn(input, "price")) requirePermission(current, "prices");
          const before = {
            name: product.name,
            category: product.category,
            price: product.regularPrice,
            hidden: product.hidden,
            brand: product.brand,
            image: product.image,
            ...s.products[sku],
          };
          s.products[sku] = { ...s.products[sku], ...input };
          audit(s, current, "product.update", sku, before, { ...before, ...input });
        });
        state = await storage.read();
        return json(await productForAdmin(sku, state));
      }
    }
    if (path === "promotions") {
      requirePermission(user, "promotions");
      if (req.method === "GET") return json(state.promotions);
      if (req.method === "POST") {
        const input = promoSchema.parse(await body(req));
        if (input.targetType === "category")
          assert(categories.has(input.target), 422, "קטגוריה לא תקינה");
        if (input.targetType === "product")
          assert(await loadProductImpl(input.target), 422, "מק״ט לא קיים");
        const p = { ...input, id: input.id || randomUUID() };
        await storage.transaction((s) => {
          const u = authenticated(req, s);
          requirePermission(u, "promotions");
          const old = s.promotions.find((x) => x.id === p.id);
          s.promotions = s.promotions.filter((x) => x.id !== p.id);
          s.promotions.push(p);
          audit(s, u, "promotion.save", p.id, old || null, p);
        });
        return json(p);
      }
    }
    if (path === "homepage/image" && req.method === "POST") {
      requirePermission(user, "homepage");
      const input = z
        .object({ base64: z.string().max(2_800_000) })
        .strict()
        .parse(await body(req));
      const image = imageBytes(input.base64);
      const file = await storage.putFile(image.bytes, image.ext);
      await storage.transaction((s) => {
        const u = authenticated(req, s);
        requirePermission(u, "homepage");
        s.assets = [...(s.assets || []), file];
        audit(s, u, "homepage.image", "home", null, { image: `/api/admin/media/${file}` });
      });
      return json({ image: `/api/admin/media/${file}` });
    }
    if (path === "homepage") {
      requirePermission(user, "homepage");
      if (req.method === "GET") return json(state.home);
      if (req.method === "PUT") {
        const input = homeSchema.parse(await body(req));
        for (const sku of input.featuredSkus || [])
          assert(await loadProductImpl(sku), 422, "מק״ט מומלץ לא קיים");
        assert(
          new Set(input.categoryOrder).size === input.categoryOrder.length,
          422,
          "קטגוריות כפולות",
        );
        await storage.transaction((s) => {
          const u = authenticated(req, s);
          requirePermission(u, "homepage");
          const old = s.home;
          s.home = input;
          audit(s, u, "homepage.publish", "home", old, input);
        });
        return json(input);
      }
    }
    if (path === "users") {
      assert(user.role === "owner", 403, "ניהול צוות לבעלים בלבד");
      if (req.method === "GET") return json(state.users.map(safeUser));
      if (req.method === "POST") {
        const input = userSchema.parse(await body(req));
        const old = state.users.find((u) => u.id === input.id);
        assert(
          !old || old.role !== "owner",
          422,
          "פרטי בעלים מקומי מוגדרים בסביבה; אין לשנותם כאן",
        );
        assert(input.role === "employee", 422, "יצירת בעלים נוסף אינה זמינה במצב מקומי");
        assert(old || input.password, 422, "נדרשת סיסמה ראשונית באורך 12 תווים לפחות");
        assert(
          !state.users.some((u) => u.username === input.username && u.id !== input.id),
          422,
          "שם המשתמש כבר קיים",
        );
        const saved: AdminUser = {
          id: old?.id || randomUUID(),
          username: input.username,
          name: input.name,
          role: "employee",
          permissions: input.permissions,
          active: input.active,
          version: (old?.version || 0) + 1,
          passwordHash: input.password ? passwordHash(input.password) : old!.passwordHash,
        };
        await storage.transaction((s) => {
          const u = authenticated(req, s);
          assert(u.role === "owner", 403, "לבעלים בלבד");
          assert(
            !s.users.some((x) => x.username === saved.username && x.id !== saved.id),
            422,
            "שם המשתמש כבר קיים",
          );
          const before = s.users.find((x) => x.id === saved.id);
          s.users = s.users.filter((x) => x.id !== saved.id);
          s.users.push(saved);
          s.sessions = s.sessions.filter((x) => x.userId !== saved.id);
          audit(s, u, "user.save", saved.id, before ? safeUser(before) : null, safeUser(saved));
        });
        return json(safeUser(saved));
      }
    }
    if (path === "orders" && req.method === "GET") {
      requirePermission(user, "orders");
      return json(state.orders.slice().reverse());
    }
    if (path.startsWith("orders/")) {
      requirePermission(user, "orders");
      const [, id, action] = path.split("/");
      const order = state.orders.find((o) => o.id === id);
      assert(order, 404, "הזמנה לא נמצאה");
      if (action === "pdf" && req.method === "GET") {
        assert(order.pdfFile, 404, "לא נשמר PDF");
        const bytes = await storage.getFile(order.pdfFile);
        return new Response(new Uint8Array(bytes), {
          headers: {
            "content-type": "application/pdf",
            "content-disposition": `attachment; filename="${order.ref}.pdf"`,
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
          },
        });
      }
      if (req.method === "PATCH") {
        const input = z
          .object({ status: z.enum(["waiting", "handled"]) })
          .strict()
          .parse(await body(req));
        await storage.transaction((s) => {
          const u = authenticated(req, s);
          requirePermission(u, "orders");
          const o = s.orders.find((o) => o.id === id)!;
          audit(s, u, "order.status", id, { status: o.status }, { status: input.status });
          o.status = input.status;
          o.handledBy = u.username;
        });
        return json({ ok: true });
      }
    }
    if (path === "audit" && req.method === "GET") {
      assert(user.role === "owner", 403, "לבעלים בלבד");
      return json(state.audit.slice(-200).reverse());
    }
    return json({ error: "לא נמצא" }, 404);
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 429)
        console.warn(
          JSON.stringify({ event: "admin_rate_limit", path: new URL(req.url).pathname }),
        );
      return json(
        { error: e.message },
        e.status,
        e.status === 429
          ? {
              "x-admin-error": "rate-limit",
              "retry-after": String(e.retryAfter || 60),
            }
          : undefined,
      );
    }
    if (e instanceof z.ZodError)
      return json(
        {
          error: "נתונים לא תקינים",
          issues: e.issues.map((i) => ({ path: i.path, message: i.message })),
        },
        422,
      );
    console.error("[admin] request failed", e instanceof Error ? e.message : "unknown");
    return json(
      {
        error:
          adminRuntimeMode() === "preview-demo"
            ? "הפעולה לא הושלמה במצב בדיקה. רעננו את הדף ונסו שוב; הנתונים זמניים."
            : "הפעולה לא הושלמה. בדקו את הגדרות האחסון המקומי ונסו שוב.",
      },
      503,
    );
  }
}
