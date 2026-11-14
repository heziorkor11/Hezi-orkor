import { adminEnabled, adminMode, publicSiteOrigin } from "./config";
import { authenticate, addUser, listUsers, setUserActive, deleteUser, findUserById, usersPersistence } from "./users.server";
import { issueSession, readSession, issueRevertToken, readRevertToken, issuePdfUploadToken, readPdfUploadToken, randomId, type SessionPayload } from "./tokens";
import { sessionFromRequest, setSessionCookieHeader, clearSessionCookieHeader } from "./cookies";
import { clientIp, rateLimit, rateLimitReset } from "./rate-limit";
import { ensureAdminOverlay, readActivity, appendActivity, saveActivityList, writeCatalogFile, readCatalogFile, buildPublicOverlay } from "./storage.server";
import { notifyProductChange, changeFromFields } from "./notify-product-change";
import { adminProductRow, homeStats, listAdminProducts } from "./catalog-query.server";
import { getOrder, listOrders, saveOrder, ingestCartOrder, ordersPersistence, nextStatus } from "./orders.server";
import { notifyMasterChange, sendTestNotification, smtpConfigured, notifyEmail } from "./mail.server";
import { catalogPrice, ceilShekel } from "@/lib/prices";
import { isWorkshopPackSku, allTaxonomyCategories, categoryDisplayName, isHiddenCategory } from "@/lib/display-taxonomy";
import { brand } from "@/lib/brand";
import type { ActivityEntry, AdminRole, OrderEvent, SafeUser, StoredOrder, TagDef } from "./types";
import { getTagLibrary } from "@/lib/product-tags";

function json(data: unknown, status = 200, extra?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", ...(extra || {}) },
  });
}

function text(body: string, status = 200, extra?: HeadersInit) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", ...(extra || {}) } });
}

async function bodyOf<T>(req: Request): Promise<T> {
  return (await req.json()) as T;
}

function session(req: Request): SessionPayload | null {
  const tok = sessionFromRequest(req);
  return tok ? readSession(tok) : null;
}

async function requireUser(req: Request): Promise<SessionPayload | Response> {
  const s = session(req);
  if (!s) return json({ error: "נדרשת כניסה" }, 401);
  const user = await findUserById(s.sub);
  if (!user || !user.active) return json({ error: "נדרשת כניסה" }, 401);
  return s;
}

async function requireMaster(req: Request): Promise<SessionPayload | Response> {
  const s = await requireUser(req);
  if (s instanceof Response) return s;
  if (s.role !== "master") return json({ error: "פעולה זו למאסטר בלבד" }, 403);
  return s;
}

function canEditProduct(role: AdminRole) {
  return role === "master" || role === "worker";
}

function canManageSite(role: AdminRole) {
  return role === "master";
}

async function logAndMaybeMail(actor: SessionPayload, entry: Omit<ActivityEntry, "id" | "at" | "actorId" | "actorName" | "actorRole">) {
  const full: ActivityEntry = {
    id: randomId("act"),
    at: new Date().toISOString(),
    actorId: actor.sub,
    actorName: actor.name,
    actorRole: actor.role,
    ...entry,
  };
  await appendActivity(full, `chore(admin): ${entry.action} ${entry.target}`);
  let mail: { sent: boolean; reason?: string } | undefined;
  if (actor.role === "worker") mail = await notifyMasterChange(full);
  return { entry: full, mail };
}

export async function adminApi(req: Request): Promise<Response> {
  await ensureAdminOverlay();
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = req.method.toUpperCase();

  if (path === "/api/catalog-overlay" && method === "GET") {
    return json(await buildPublicOverlay());
  }

  const catalogImage = path.match(/^\/api\/catalog-image\/([^/]+)$/);
  if (catalogImage && method === "GET") {
    const sku = decodeURIComponent(catalogImage[1]);
    const { loadImageBytesForSku } = await import("./product-image.server");
    const file = await loadImageBytesForSku(sku);
    if (!file) return json({ error: "אין תמונה" }, 404);
    return new Response(file.bytes, {
      status: 200,
      headers: {
        "Content-Type": file.mime,
        "Cache-Control": "public, max-age=3600",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  if (path === "/api/orders" && method === "POST") {
    const rl = rateLimit(`orders:${clientIp(req)}`, 20, 60_000);
    if (!rl.ok) return json({ error: "יותר מדי בקשות" }, 429, { "Retry-After": String(rl.retryAfter) });
    try {
      const input = await bodyOf<{
        id?: string;
        customer: StoredOrder["customer"];
        delivery: StoredOrder["delivery"];
        lines: { sku: string; name: string; qty: number }[];
        subtotal?: number;
        source?: string;
      }>(req);
      if (!input?.customer?.name || !input.customer?.phone || !Array.isArray(input.lines) || !input.lines.length) {
        return json({ error: "חסרים פרטי הזמנה" }, 400);
      }
      const lines = input.lines.map((l) => {
        const unit = catalogPrice(l.sku);
        const qty = Math.max(1, Number(l.qty) || 1);
        return {
          sku: String(l.sku),
          name: String(l.name || l.sku),
          qty,
          unitPrice: unit,
          lineTotal: unit == null ? null : unit * qty,
        };
      });
      const subtotal = lines.reduce((s, l) => s + (l.lineTotal || 0), 0);
      const shipping =
        input.delivery === "delivery" && subtotal > 0 && subtotal < brand.freeShipFrom ? brand.shipping : 0;
      const persist = await ordersPersistence();
      const order = await ingestCartOrder({
        id: input.id,
        customer: {
          name: String(input.customer.name).slice(0, 80),
          phone: String(input.customer.phone).slice(0, 20),
          plate: input.customer.plate ? String(input.customer.plate).slice(0, 20) : undefined,
          city: input.customer.city ? String(input.customer.city).slice(0, 60) : undefined,
          make: input.customer.make,
          model: input.customer.model,
          year: input.customer.year,
          engine: input.customer.engine,
          notes: input.customer.notes ? String(input.customer.notes).slice(0, 500) : undefined,
        },
        delivery: input.delivery === "pickup" || input.delivery === "delivery" ? input.delivery : "",
        lines,
        subtotal,
        shipping,
        total: subtotal + shipping,
        source: "whatsapp-cart",
      });
      return json({
        ok: true,
        id: order.id,
        durable: persist.durable,
        notice: persist.durable ? undefined : persist.reason,
        pdfUploadToken: issuePdfUploadToken(order.id),
      });
    } catch (err) {
      console.warn("[admin] ingest failed", err instanceof Error ? err.message : err);
      return json({ ok: false }, 500);
    }
  }

  const publicPdf = path.match(/^\/api\/orders\/([^/]+)\/pdf$/);
  if (publicPdf && method === "POST") {
    const rl = rateLimit(`order-pdf:${clientIp(req)}`, 20, 60_000);
    if (!rl.ok) return json({ error: "יותר מדי בקשות" }, 429);
    const id = decodeURIComponent(publicPdf[1]);
    const token = req.headers.get("x-hezi-pdf-token") || url.searchParams.get("token") || "";
    if (readPdfUploadToken(token) !== id) return json({ error: "הקישור להעלאת PDF אינו תקף" }, 403);
    const order = await getOrder(id);
    if (!order) return json({ error: "הזמנה לא נמצאה" }, 404);
    const buf = Buffer.from(await req.arrayBuffer());
    const { storeOrderPdf } = await import("./order-pdf-store.server");
    await storeOrderPdf(id, buf);
    return json({ ok: true });
  }

  if (!path.startsWith("/api/admin")) return json({ error: "not found" }, 404);

  if (!adminEnabled()) {
    return json({ error: "לוח הניהול כבוי בסביבה הזו", mode: adminMode() }, 503);
  }

  if (path === "/api/admin/login" && method === "POST") {
    const ip = clientIp(req);
    const { username, password } = await bodyOf<{ username?: string; password?: string }>(req);
    const userKey = `login:${(username || "").trim().toLowerCase()}:${ip}`;
    const ipKey = `login-ip:${ip}`;
    const a = rateLimit(userKey, 10, 60_000);
    const b = rateLimit(ipKey, 60, 60_000);
    if (!a.ok || !b.ok) {
      return json({ error: "יותר מדי ניסיונות כניסה. נסו שוב בעוד דקה." }, 429, { "Retry-After": String(Math.max(a.retryAfter, b.retryAfter)), "x-admin-error": "rate-limit" });
    }
    const user = await authenticate(username || "", password || "");
    if (!user) return json({ error: "שם משתמש או סיסמה שגויים" }, 401);
    rateLimitReset(userKey);
    const token = issueSession(user);
    return json({ ok: true, user: { id: user.id, username: user.username, name: user.name, role: user.role, active: user.active } }, 200, { "Set-Cookie": setSessionCookieHeader(token) });
  }

  if (path === "/api/admin/logout" && method === "POST") {
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookieHeader() });
  }

  if (path === "/api/admin/me" && method === "GET") {
    const s = session(req);
    if (!s) return json({ user: null, mode: adminMode() }, 200);
    const live = await findUserById(s.sub);
    if (!live || !live.active) return json({ user: null, mode: adminMode() }, 200);
    return json({
      user: { id: live.id, username: live.username, name: live.name, role: live.role, active: live.active } satisfies SafeUser,
      mode: adminMode(),
    });
  }

  if (path === "/api/admin/home" && method === "GET") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    const [stats, activity, orders, persist] = await Promise.all([
      homeStats(),
      readActivity(),
      listOrders(),
      ordersPersistence(),
    ]);
    return json({
      stats,
      activity: activity.slice(0, 8),
      orders: orders.slice(0, 8),
      newOrders: orders.filter((o) => o.status === "new").length,
      persist,
    });
  }

  if (path === "/api/admin/products/next-sku" && method === "GET") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    if (!canEditProduct(u.role)) return json({ error: "אין הרשאה" }, 403);
    const { nextSku } = await import("./product-admin.server");
    return json(await nextSku(url.searchParams.get("category") || "", url.searchParams.get("subType") || undefined));
  }

  if (path === "/api/admin/products" && method === "POST") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    if (!canEditProduct(u.role)) return json({ error: "אין הרשאה" }, 403);
    const body = await bodyOf<{
      name?: string;
      category?: string;
      subType?: string;
      fitment?: string;
      make?: string;
      model?: string;
      yearFrom?: number;
      yearTo?: number;
      oe?: string;
      price?: number | null;
      tags?: string[];
      stock?: string;
    }>(req);
    if (u.role !== "master" && body.price != null) {
      return json({ error: "שינוי מחיר למאסטר בלבד. המוצר יישמר בלי מחיר והמאסטר יוכל להשלים אותו." }, 403);
    }
    try {
      const { createAddedProduct } = await import("./product-admin.server");
      const added = await createAddedProduct({
        actor: u,
        name: String(body.name || ""),
        category: String(body.category || ""),
        subType: body.subType,
        fitment: body.fitment,
        make: body.make,
        model: body.model,
        yearFrom: body.yearFrom,
        yearTo: body.yearTo,
        oe: body.oe,
        price: u.role === "master" ? body.price : null,
        tags: body.tags,
        stock: body.stock,
      });
      const logged = await logAndMaybeMail(u, {
        action: "הוספת מוצר",
        sku: added.sku,
        target: added.sku,
        before: null,
        after: { sku: added.sku, name: added.name, category: added.category, hidden: false },
      });
      await notifyProductChange({ action: "add", sku: added.sku, actor: u.name, fields: ["add"] });
      return json({ ok: true, product: await adminProductRow(added.sku), activity: logged.entry, mail: logged.mail });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : "לא ניתן להוסיף מוצר" }, 400);
    }
  }

  if (path === "/api/admin/products" && method === "GET") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    const list = await listAdminProducts({
      q: url.searchParams.get("q") || undefined,
      category: url.searchParams.get("category") || undefined,
      tag: url.searchParams.get("tag") || undefined,
      image: (url.searchParams.get("image") as "all" | "yes" | "no") || "all",
      price: (url.searchParams.get("price") as "all" | "none") || "all",
      hidden: (url.searchParams.get("hidden") as "all" | "yes" | "no") || "all",
      page: Number(url.searchParams.get("page") || 1),
      pageSize: Number(url.searchParams.get("pageSize") || 40),
    });
    return json(list);
  }

  const productMatch = path.match(/^\/api\/admin\/products\/([^/]+)$/);
  if (productMatch && method === "GET") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    const sku = decodeURIComponent(productMatch[1]);
    return json({ product: await adminProductRow(sku), tags: getTagLibrary() });
  }

  if (productMatch && method === "POST") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    if (!canEditProduct(u.role)) return json({ error: "אין הרשאה" }, 403);
    const sku = decodeURIComponent(productMatch[1]);
    const patch = await bodyOf<{
      name?: string;
      price?: number | null;
      category?: string;
      hidden?: boolean;
      tags?: string[];
    }>(req);
    const before = await adminProductRow(sku);
    const changes: string[] = [];

    if (typeof patch.name === "string") {
      const file = await readCatalogFile<{ bySku?: Record<string, string> }>("public/catalog/name-overrides.json", { bySku: {} });
      const bySku = { ...(file.bySku || {}) };
      const next = patch.name.trim();
      if (next && next !== before.name) {
        bySku[sku] = next;
        await writeCatalogFile({ path: "public/catalog/name-overrides.json", data: { ...file, bySku }, message: `chore(admin): name ${sku}` });
        changes.push("name");
      }
    }
    if (patch.price !== undefined) {
      if (u.role !== "master") return json({ error: "שינוי מחיר למאסטר בלבד" }, 403);
      if (isWorkshopPackSku(sku)) return json({ error: "למארזי מוסך אין מחיר מספרי באתר" }, 400);
      const file = await readCatalogFile<{ bySku?: Record<string, number> }>("public/catalog/price-overrides.json", { bySku: {} });
      const bySku = { ...(file.bySku || {}) };
      if (patch.price == null) {
        delete bySku[sku];
      } else {
        const n = ceilShekel(Number(patch.price));
        if (!Number.isFinite(n) || n <= 0) return json({ error: "מחיר לא תקין" }, 400);
        bySku[sku] = n;
      }
      await writeCatalogFile({ path: "public/catalog/price-overrides.json", data: { ...file, bySku }, message: `chore(admin): price ${sku}` });
      changes.push("price");
    }
    if (typeof patch.category === "string" && patch.category && patch.category !== before.category) {
      const file = await readCatalogFile<{ bySku?: Record<string, { category: string; reason?: string }> }>(
        "public/catalog/display-category-overrides.json",
        { bySku: {} },
      );
      const bySku = { ...(file.bySku || {}) };
      bySku[sku] = { category: patch.category, reason: "עודכן מדאשבורד הניהול" };
      await writeCatalogFile({
        path: "public/catalog/display-category-overrides.json",
        data: { ...file, bySku },
        message: `chore(admin): category ${sku}`,
      });
      changes.push("category");
    }
    if (typeof patch.hidden === "boolean" && patch.hidden !== before.hidden) {
      const file = await readCatalogFile<{ version?: number; bySku?: Record<string, { hidden: boolean; reason?: string }> }>(
        "public/catalog/visibility-overrides.json",
        { version: 1, bySku: {} },
      );
      const bySku = { ...(file.bySku || {}) };
      bySku[sku] = { hidden: patch.hidden, reason: "עודכן מדאשבורד הניהול" };
      await writeCatalogFile({
        path: "public/catalog/visibility-overrides.json",
        data: { ...file, version: 1, bySku },
        message: `chore(admin): visibility ${sku}`,
      });
      changes.push("hidden");
    }
    if (typeof (patch as { stock?: string }).stock === "string") {
      const { saveStock } = await import("./product-admin.server");
      await saveStock(sku, (patch as { stock?: string }).stock || "");
      changes.push("stock");
    }
    if (Array.isArray(patch.tags)) {
      const ids = patch.tags.slice(0, 2);
      const file = await readCatalogFile<{ version?: number; bySku?: Record<string, string[]> }>("public/catalog/product-tags.json", { version: 1, bySku: {} });
      const bySku = { ...(file.bySku || {}) };
      bySku[sku] = ids;
      await writeCatalogFile({
        path: "public/catalog/product-tags.json",
        data: { ...file, version: 1, bySku },
        message: `chore(admin): tags ${sku}`,
      });
      changes.push("tags");
    }
    const after = await adminProductRow(sku);
    const logged = changes.length
      ? await logAndMaybeMail(u, {
          action: `עריכת מוצר (${changes.join(", ")})`,
          sku,
          target: sku,
          before: { name: before.name, price: before.price, category: before.category, hidden: before.hidden, tags: before.tags.map((t) => t.id) },
          after: { name: after.name, price: after.price, category: after.category, hidden: after.hidden, tags: after.tags.map((t) => t.id) },
        })
      : null;
    if (changes.length) {
      await notifyProductChange(changeFromFields(changes, { sku, actor: u.name, hidden: after.hidden }));
    }
    return json({ ok: true, product: after, activity: logged?.entry, mail: logged?.mail });
  }

  const productImage = path.match(/^\/api\/admin\/products\/([^/]+)\/image$/);
  if (productImage && method === "POST") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    if (!canEditProduct(u.role)) return json({ error: "אין הרשאה" }, 403);
    const sku = decodeURIComponent(productImage[1]);
    const before = await adminProductRow(sku);
    const payload = await bodyOf<{ imageBase64?: string; mimeType?: string }>(req);
    if (!payload.imageBase64) return json({ error: "חסרה תמונה" }, 400);
    let bytes: Buffer;
    try {
      bytes = Buffer.from(payload.imageBase64, "base64");
    } catch {
      return json({ error: "תמונה לא תקינה" }, 400);
    }
    try {
      const { saveAdminImage } = await import("./product-image.server");
      const saved = await saveAdminImage({ sku, bytes, mime: payload.mimeType || "image/jpeg" });
      const { saveImageOverride } = await import("./product-admin.server");
      await saveImageOverride(sku, saved.publicUrl);
      const after = await adminProductRow(sku);
      const logged = await logAndMaybeMail(u, {
        action: "החלפת תמונה",
        sku,
        target: sku,
        before: { image: before.image || null },
        after: { image: after.image || saved.publicUrl },
      });
      await notifyProductChange({ action: "image", sku, actor: u.name, fields: ["image"] });
      return json({ ok: true, product: after, image: saved.publicUrl, activity: logged.entry, mail: logged.mail });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : "לא ניתן לשמור תמונה" }, 400);
    }
  }

  if (path === "/api/admin/products/bulk" && method === "POST") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    if (!canEditProduct(u.role)) return json({ error: "אין הרשאה" }, 403);
    const body = await bodyOf<{ skus: string[]; tag?: string; category?: string; hidden?: boolean }>(req);
    const skus = (body.skus || []).slice(0, 50);
    for (const sku of skus) {
      await adminApi(
        new Request(new URL(`/api/admin/products/${encodeURIComponent(sku)}`, req.url).toString(), {
          method: "POST",
          headers: { cookie: req.headers.get("cookie") || "", "content-type": "application/json" },
          body: JSON.stringify({ tag: undefined, tags: body.tag ? [body.tag] : undefined, category: body.category, hidden: body.hidden }),
        }),
      );
    }
    return json({ ok: true, count: skus.length });
  }

  if (path === "/api/admin/categories" && method === "GET") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    const cats = allTaxonomyCategories.map((c) => ({
      ...c,
      name: categoryDisplayName(c.id, c.name),
      hidden: isHiddenCategory(c.id),
    }));
    return json({ categories: cats });
  }

  if (path === "/api/admin/categories" && method === "POST") {
    const u = await requireMaster(req);
    if (u instanceof Response) return u;
    const body = await bodyOf<{ hidden?: string[]; labels?: Record<string, string>; order?: string[]; move?: { skus: string[]; category: string } }>(req);
    if (body.hidden) {
      const current = await readCatalogFile<{ description?: string; hiddenCategories?: string[]; version?: number }>(
        "public/catalog/hidden-categories.json",
        { version: 1, hiddenCategories: [] },
      );
      await writeCatalogFile({
        path: "public/catalog/hidden-categories.json",
        data: { ...current, hiddenCategories: body.hidden },
        message: "chore(admin): hidden categories",
      });
    }
    if (body.labels) {
      await writeCatalogFile({
        path: "public/catalog/category-label-overrides.json",
        data: { version: 1, byId: body.labels },
        message: "chore(admin): category labels",
      });
    }
    if (body.order) {
      await writeCatalogFile({
        path: "public/catalog/category-order-overrides.json",
        data: { version: 1, ids: body.order },
        message: "chore(admin): category order",
      });
    }
    if (body.move?.skus?.length && body.move.category) {
      const file = await readCatalogFile<{ bySku?: Record<string, { category: string; reason?: string }> }>(
        "public/catalog/display-category-overrides.json",
        { bySku: {} },
      );
      const bySku = { ...(file.bySku || {}) };
      for (const sku of body.move.skus) bySku[sku] = { category: body.move.category, reason: "הועבר מדאשבורד הניהול" };
      await writeCatalogFile({
        path: "public/catalog/display-category-overrides.json",
        data: { ...file, bySku },
        message: `chore(admin): move products to ${body.move.category}`,
      });
    }
    await logAndMaybeMail(u, { action: "עדכון קטגוריות", target: "categories", before: null, after: body });
    if (body.hidden) {
      await notifyProductChange({ action: "hide", actor: u.name, fields: ["hidden-categories"] });
    }
    if (body.move?.skus?.length) {
      for (const sku of body.move.skus.slice(0, 50)) {
        await notifyProductChange({ action: "category", sku, actor: u.name, fields: ["category"] });
      }
    }
    const cats = allTaxonomyCategories.map((c) => ({ ...c, name: categoryDisplayName(c.id, c.name), hidden: isHiddenCategory(c.id) }));
    return json({ ok: true, categories: cats });
  }

  if (path === "/api/admin/tags" && method === "GET") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    const library = await readCatalogFile<{ tags?: TagDef[] }>("public/catalog/tag-library.json", { tags: [] });
    const deals = await readCatalogFile<{ skus?: string[] }>("public/catalog/home-deals-overrides.json", { skus: [] });
    return json({ tags: library.tags || getTagLibrary(), deals: deals.skus || [] });
  }

  if (path === "/api/admin/tags" && method === "POST") {
    const u = await requireMaster(req);
    if (u instanceof Response) return u;
    const body = await bodyOf<{ tags?: TagDef[]; add?: TagDef; deals?: string[] }>(req);
    if (body.add) {
      const file = await readCatalogFile<{ version?: number; tags?: TagDef[] }>("public/catalog/tag-library.json", { version: 1, tags: [] });
      const tags = [...(file.tags || [])];
      const id = body.add.id.replace(/[^a-z0-9_-]/gi, "").slice(0, 24) || randomId("tag");
      if (tags.some((t) => t.id === id)) return json({ error: "מזהה התג כבר קיים" }, 400);
      tags.push({ id, label: body.add.label.trim().slice(0, 24), color: body.add.color || "#e23b12" });
      await writeCatalogFile({ path: "public/catalog/tag-library.json", data: { version: 1, tags }, message: `chore(admin): add tag ${id}` });
    }
    if (Array.isArray(body.tags)) {
      await writeCatalogFile({ path: "public/catalog/tag-library.json", data: { version: 1, tags: body.tags }, message: "chore(admin): tag library" });
    }
    if (Array.isArray(body.deals)) {
      await writeCatalogFile({
        path: "public/catalog/home-deals-overrides.json",
        data: { version: 1, skus: body.deals.slice(0, 16) },
        message: "chore(admin): monthly deals",
      });
    }
    await logAndMaybeMail(u, { action: "עדכון תגים/מבצעים", target: "tags", before: null, after: body });
    await notifyProductChange({ action: "tag", actor: u.name, fields: ["tags"] });
    const library = await readCatalogFile<{ tags?: TagDef[] }>("public/catalog/tag-library.json", { tags: [] });
    const deals = await readCatalogFile<{ skus?: string[] }>("public/catalog/home-deals-overrides.json", { skus: [] });
    return json({ ok: true, tags: library.tags, deals: deals.skus });
  }

  if (path === "/api/admin/activity" && method === "GET") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    return json({ entries: await readActivity() });
  }

  const revertApi = path.match(/^\/api\/admin\/activity\/([^/]+)\/revert$/);
  if (revertApi && method === "POST") {
    const u = await requireMaster(req);
    if (u instanceof Response) return u;
    const result = await revertActivity(revertApi[1], u.name);
    if (!result.ok) return json({ error: result.error }, 400);
    return json(result);
  }

  if (path === "/api/admin/users" && method === "GET") {
    const u = await requireMaster(req);
    if (u instanceof Response) return u;
    return json({ users: await listUsers(), persist: await usersPersistence() });
  }

  if (path === "/api/admin/users" && method === "POST") {
    const u = await requireMaster(req);
    if (u instanceof Response) return u;
    const body = await bodyOf<{ username: string; name: string; role: AdminRole; password: string }>(req);
    try {
      const created = await addUser(body);
      await logAndMaybeMail(u, { action: "הוספת עובד", target: created.username, before: null, after: { username: created.username, role: created.role } });
      return json({ ok: true, user: created, users: await listUsers() });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : "לא ניתן להוסיף משתמש" }, 400);
    }
  }

  const userPatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userPatch && method === "DELETE") {
    const u = await requireMaster(req);
    if (u instanceof Response) return u;
    try {
      const removed = await deleteUser(userPatch[1]);
      await logAndMaybeMail(u, { action: "מחיקת עובד", target: removed.username, before: { username: removed.username, role: removed.role }, after: null });
      return json({ ok: true, user: removed, users: await listUsers() });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : "לא ניתן למחוק משתמש" }, 400);
    }
  }
  if (userPatch && method === "POST") {
    const u = await requireMaster(req);
    if (u instanceof Response) return u;
    const body = await bodyOf<{ active?: boolean; delete?: boolean }>(req);
    if (body.delete === true) {
      try {
        const removed = await deleteUser(userPatch[1]);
        await logAndMaybeMail(u, { action: "מחיקת עובד", target: removed.username, before: { username: removed.username, role: removed.role }, after: null });
        return json({ ok: true, user: removed, users: await listUsers() });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : "לא ניתן למחוק משתמש" }, 400);
      }
    }
    if (typeof body.active === "boolean") {
      const updated = await setUserActive(userPatch[1], body.active);
      await logAndMaybeMail(u, {
        action: body.active ? "הפעלת עובד" : "השבתת עובד",
        target: updated.username,
        before: { username: updated.username, active: !body.active },
        after: { username: updated.username, active: body.active },
      });
      return json({ ok: true, user: updated, users: await listUsers() });
    }
    return json({ error: "אין מה לעדכן" }, 400);
  }

  if (path === "/api/admin/orders" && method === "GET") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    const persist = await ordersPersistence();
    const orders = await listOrders();
    const counts = {
      all: orders.length,
      new: orders.filter((o) => o.status === "new").length,
      checking: orders.filter((o) => o.status === "checking").length,
      preparing: orders.filter((o) => o.status === "preparing").length,
      shipped: orders.filter((o) => o.status === "shipped").length,
      done: orders.filter((o) => o.status === "done").length,
    };
    return json({ orders, counts, persist });
  }

  const orderMatch = path.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if (orderMatch && method === "GET") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    const order = await getOrder(decodeURIComponent(orderMatch[1]));
    if (!order) return json({ error: "הזמנה לא נמצאה" }, 404);
    const persist = await ordersPersistence();
    return json({ order, persist, users: u.role === "master" ? await listUsers() : [] });
  }

  if (orderMatch && method === "POST") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    const order = await getOrder(decodeURIComponent(orderMatch[1]));
    if (!order) return json({ error: "הזמנה לא נמצאה" }, 404);
    const body = await bodyOf<Partial<StoredOrder> & { advance?: boolean }>(req);
    const next = { ...order, events: [...(order.events || [])] };
    const at = new Date().toISOString();
    const ev = (type: OrderEvent["type"], extra: Partial<OrderEvent> = {}): OrderEvent => ({
      at,
      by: u.sub,
      byName: u.name,
      type,
      ...extra,
    });
    if (body.advance) {
      const n = nextStatus[order.status];
      if (n) {
        next.events = [...next.events, ev("status", { from: order.status, to: n })];
        next.status = n;
      }
    }
    if (body.status && body.status !== order.status) {
      next.events = [...next.events, ev("status", { from: order.status, to: body.status })];
      next.status = body.status;
    }
    if (typeof body.assignedTo === "string" && body.assignedTo !== (order.assignedTo || "")) {
      next.assignedTo = body.assignedTo;
      next.events = [...next.events, ev("assign", { to: body.assignedTo || "", detail: body.assignedTo || "הוסר שיוך" })];
    }
    if (typeof body.scheduledDate === "string" && body.scheduledDate !== (order.scheduledDate || "")) {
      next.scheduledDate = body.scheduledDate;
      next.events = [...next.events, ev("schedule", { to: body.scheduledDate, detail: body.scheduledDate || "הוסר תאריך" })];
    }
    if (typeof body.internalNotes === "string") next.internalNotes = body.internalNotes;
    if (Array.isArray(body.lines)) next.lines = body.lines;
    await saveOrder(next);
    return json({ ok: true, order: next });
  }

  const orderPdf = path.match(/^\/api\/admin\/orders\/([^/]+)\/pdf$/);
  if (orderPdf && method === "GET") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    const id = decodeURIComponent(orderPdf[1]);
    const { readOrderPdf } = await import("./order-pdf-store.server");
    const bytes = await readOrderPdf(id);
    if (!bytes) return json({ error: "אין PDF שמור להזמנה הזו" }, 404);
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${id}.pdf"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }
  if (orderPdf && method === "POST") {
    const u = await requireUser(req);
    if (u instanceof Response) return u;
    const id = decodeURIComponent(orderPdf[1]);
    const order = await getOrder(id);
    if (!order) return json({ error: "הזמנה לא נמצאה" }, 404);
    const buf = Buffer.from(await req.arrayBuffer());
    const { storeOrderPdf } = await import("./order-pdf-store.server");
    await storeOrderPdf(id, buf, { id: u.sub, name: u.name });
    return json({ ok: true, order: await getOrder(id) });
  }


  if (path === "/api/admin/mail/status" && method === "GET") {
    const u = await requireMaster(req);
    if (u instanceof Response) return u;
    return json({ configured: smtpConfigured(), to: notifyEmail() || null });
  }

  if (path === "/api/admin/mail/test" && method === "POST") {
    const u = await requireMaster(req);
    if (u instanceof Response) return u;
    const rl = rateLimit(`mail-test:${u.sub}`, 5, 60_000);
    if (!rl.ok) return json({ error: "יותר מדי ניסיונות. נסו שוב בעוד דקה." }, 429);
    const result = await sendTestNotification();
    return json(result);
  }

  if (path === "/api/admin/revert-by-token" && (method === "POST" || method === "GET")) {
    const rl = rateLimit(`revert:${clientIp(req)}`, 20, 60_000);
    if (!rl.ok) return json({ error: "יותר מדי בקשות" }, 429);
    const body = method === "GET" ? {} : await bodyOf<{ token?: string; sample?: boolean }>(req);
    if (url.searchParams.get("sample") === "1" || body.sample) {
      return json({ ok: false, sample: true, error: "זה קישור לדוגמה בלבד — הוא לא מבטל שינוי אמיתי באתר." }, 200);
    }
    const token = method === "GET" ? url.searchParams.get("token") : body.token;
    const id = readRevertToken(token || "");
    if (!id) return json({ error: "הקישור אינו תקף או שפג תוקפו" }, 400);
    const result = await revertActivity(id, "קישור מהדוא״ל");
    if (!result.ok) return json({ error: result.error }, 400);
    return json({ ok: true });
  }

  return json({ error: "not found" }, 404);
}

export async function revertActivity(id: string, by: string): Promise<{ ok: boolean; error?: string }> {
  const entries = await readActivity();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return { ok: false, error: "הרשומה לא נמצאה" };
  if (entry.reverted) return { ok: false, error: "השינוי כבר בוטל" };
  const sku = entry.sku;
  const before = entry.before as Record<string, unknown> | null;
  if (sku && entry.action === "הוספת מוצר") {
    const vis = await readCatalogFile<{ version?: number; bySku?: Record<string, { hidden: boolean; reason?: string }> }>(
      "public/catalog/visibility-overrides.json",
      { version: 1, bySku: {} },
    );
    const bySku = { ...(vis.bySku || {}) };
    bySku[sku] = { hidden: true, reason: "בוטל מדאשבורד הניהול — המוצר הוסתר ולא נמחק" };
    await writeCatalogFile({
      path: "public/catalog/visibility-overrides.json",
      data: { ...vis, version: 1, bySku },
      message: `chore(admin): revert add (hide) ${sku}`,
    });
  }
  if (sku && before && typeof before === "object") {
    if ("price" in before) {
      const file = await readCatalogFile<{ bySku?: Record<string, number> }>("public/catalog/price-overrides.json", { bySku: {} });
      const bySku = { ...(file.bySku || {}) };
      const p = before.price;
      if (typeof p === "number" && p > 0) bySku[sku] = p;
      else delete bySku[sku];
      await writeCatalogFile({ path: "public/catalog/price-overrides.json", data: { ...file, bySku }, message: `chore(admin): revert price ${sku}` });
    }
    if ("name" in before && typeof before.name === "string") {
      const file = await readCatalogFile<{ bySku?: Record<string, string> }>("public/catalog/name-overrides.json", { bySku: {} });
      const bySku = { ...(file.bySku || {}) };
      bySku[sku] = before.name;
      await writeCatalogFile({ path: "public/catalog/name-overrides.json", data: { ...file, bySku }, message: `chore(admin): revert name ${sku}` });
    }
    if ("hidden" in before && typeof before.hidden === "boolean") {
      const file = await readCatalogFile<{ version?: number; bySku?: Record<string, { hidden: boolean; reason?: string }> }>(
        "public/catalog/visibility-overrides.json",
        { version: 1, bySku: {} },
      );
      const bySku = { ...(file.bySku || {}) };
      bySku[sku] = { hidden: before.hidden, reason: "בוטל מדאשבורד הניהול" };
      await writeCatalogFile({ path: "public/catalog/visibility-overrides.json", data: { ...file, version: 1, bySku }, message: `chore(admin): revert visibility ${sku}` });
    }
    if ("tags" in before && Array.isArray(before.tags)) {
      const file = await readCatalogFile<{ version?: number; bySku?: Record<string, string[]> }>("public/catalog/product-tags.json", { version: 1, bySku: {} });
      const bySku = { ...(file.bySku || {}) };
      bySku[sku] = before.tags as string[];
      await writeCatalogFile({ path: "public/catalog/product-tags.json", data: { ...file, version: 1, bySku }, message: `chore(admin): revert tags ${sku}` });
    }
    if (entry.action === "הוספת מוצר" || (before && before.hidden === false && entry.action.startsWith("הוספת מוצר"))) {
      const vis = await readCatalogFile<{ version?: number; bySku?: Record<string, { hidden: boolean; reason?: string }> }>(
        "public/catalog/visibility-overrides.json",
        { version: 1, bySku: {} },
      );
      const bySku = { ...(vis.bySku || {}) };
      bySku[sku] = { hidden: true, reason: "בוטל מדאשבורד הניהול — המוצר הוסתר ולא נמחק" };
      await writeCatalogFile({
        path: "public/catalog/visibility-overrides.json",
        data: { ...vis, version: 1, bySku },
        message: `chore(admin): revert add (hide) ${sku}`,
      });
    }
    if ("image" in before) {
      const file = await readCatalogFile<{ version?: number; bySku?: Record<string, string> }>("public/catalog/image-overrides.json", { version: 1, bySku: {} });
      const bySku = { ...(file.bySku || {}) };
      const img = before.image;
      if (typeof img === "string" && img) bySku[sku] = img;
      else delete bySku[sku];
      await writeCatalogFile({
        path: "public/catalog/image-overrides.json",
        data: { ...file, version: 1, bySku },
        message: `chore(admin): revert image ${sku}`,
      });
    }
    if ("category" in before && typeof before.category === "string") {
      const file = await readCatalogFile<{ bySku?: Record<string, { category: string; reason?: string }> }>(
        "public/catalog/display-category-overrides.json",
        { bySku: {} },
      );
      const bySku = { ...(file.bySku || {}) };
      bySku[sku] = { category: before.category, reason: "בוטל מדאשבורד הניהול" };
      await writeCatalogFile({ path: "public/catalog/display-category-overrides.json", data: { ...file, bySku }, message: `chore(admin): revert category ${sku}` });
    }
  }
  entry.reverted = true;
  entry.revertedAt = new Date().toISOString();
  entry.revertedBy = by;
  await saveActivityList(entries, `chore(admin): mark reverted ${id}`);
  if (sku) {
    await notifyProductChange({ action: "revert", sku, actor: by, fields: ["revert"] });
  }
  return { ok: true };
}

export function revertLandingHtml(ok: boolean, message: string) {
  const color = ok ? "#0f7a3a" : "#e23b12";
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>ביטול שינוי</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700&display=swap">
  <style>body{font-family:Heebo,Arial,sans-serif;background:#f7f7f5;display:grid;place-items:center;min-height:100vh;margin:0}
  .card{background:#fff;border:1px solid #e5e5e0;border-radius:1.125rem;padding:28px 24px;max-width:420px;text-align:center;box-shadow:0 8px 24px rgb(0 0 0/0.06)}
  h1{color:${color};font-size:22px;margin:0 0 8px}p{color:#666}a{color:#e23b12;font-weight:700}</style></head>
  <body><div class="card"><h1>${ok ? "השינוי בוטל" : "לא ניתן לבטל"}</h1><p>${message}</p>
  <p><a href="/admin/activity">ליומן הפעילות</a></p></div></body></html>`;
}

void issueRevertToken;
void publicSiteOrigin;
void text;
