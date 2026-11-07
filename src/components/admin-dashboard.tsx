import { AdminCreateProduct } from "./admin-create-product";
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Bell,
  Box,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  GripVertical,
  Home,
  ImagePlus,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  Users,
  X,
} from "lucide-react";
import { adminRequest, readUpload } from "@/lib/admin/client";
import { refreshAdminOverlay, adminSnapshot } from "@/lib/admin/overlay";
import { regularCatalogPrice } from "@/lib/prices";
import { loadProduct } from "@/lib/catalog";
import { displayCategories, subcategories } from "@/lib/display-taxonomy";
import {
  PERMISSIONS,
  type Permission,
  type Promotion,
  type HomeSettings,
  type SafeUser,
  type StoredOrder,
  type AuditEntry,
  type Banner,
} from "@/lib/admin/types";
import type { Product } from "@/lib/catalog-types";
const labels: Record<Permission, string> = {
  products: "עריכת מוצרים והעלאת תמונות",
  "add-products": "הוספת מוצרים חדשים (בנוסף לעריכת מוצרים)",
  prices: "עדכון מחירים (בנוסף לעריכת מוצרים)",
  promotions: "יצירת ועדכון מבצעים",
  orders: "טיפול בהזמנות",
  homepage: "פרסום שינויים בדף הבית",
};
type Notice = (text: ReactNode) => void;
const money = (v: number | null | undefined) =>
  v == null
    ? "הצעת מחיר"
    : new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        maximumFractionDigits: 2,
      }).format(v);
const time = (iso: string) =>
  new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Jerusalem",
  }).format(new Date(iso));
const actionLabels: Record<string, string> = {
  "auth.login": "כניסה לניהול",
  "product.create": "הוספת מוצר",
  "product.update": "עדכון מוצר ומחיר",
  "product.image": "עדכון תמונת מוצר",
  "promotion.save": "שמירת מבצע",
  "homepage.publish": "פרסום דף הבית",
  "homepage.image": "העלאת צילום לבאנר",
  "user.save": "עדכון עובד והרשאות",
  "order.capture": "קליטת בקשת הזמנה",
  "order.status": "עדכון סטטוס הזמנה",
};
function actionLabel(action: string) {
  return actionLabels[action] || action;
}
function allowed(user: SafeUser, p: Permission) {
  return user.role === "owner" || user.permissions.includes(p);
}
function Action({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={`ad-button ${secondary ? "ad-secondary" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="ad-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="ad-switch-row">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="ad-card ad-empty">{text}</div>;
}
function Loading() {
  return (
    <p role="status" className="ad-note">
      טוען נתונים…
    </p>
  );
}
function Denied() {
  return <Empty text="אין לך הרשאה למסך הזה. פנו לבעלים לשינוי הרשאות." />;
}
function Login({
  onLogin,
  notice,
  checking = false,
}: {
  onLogin: (u: SafeUser) => void;
  notice: Notice;
  checking?: boolean;
}) {
  const [username, setUsername] = useState(
    adminSnapshot().mode === "preview-demo" ? "preview-owner" : "owner",
  );
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (checking || busy) return;
    setBusy(true);
    try {
      const r = await adminRequest<{ user: SafeUser }>("login", "POST", { username, password });
      setPassword("");
      onLogin(r.user);
    } catch (e) {
      notice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ad-login ad-card">
      <ShieldCheck size={36} />
      <h1>כניסה לניהול</h1>
      <p>גישה מאובטחת לבעלים ולעובדים בלבד.</p>
      <form onSubmit={submit}>
        <Field label="שם משתמש">
          <input
            disabled={checking}
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            dir="ltr"
          />
        </Field>
        <Field label="סיסמה">
          <input
            disabled={checking}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            maxLength={128}
          />
        </Field>
        <Action type="submit" disabled={busy || checking}>
          {checking ? "בודק התחברות…" : busy ? "מתחבר…" : "כניסה לניהול"}
        </Action>
      </form>
      <p className="ad-note">
        כניסה בתוך האתר בלבד. ללא הגדרות סביבה מתאימות הניהול נשאר כבוי; אין סיסמת ברירת מחדל.
      </p>
    </div>
  );
}
export function AdminDashboard() {
  const location = useLocation();
  const section = location.pathname.split("/")[2] || "home";
  const [user, setUser] = useState<SafeUser | null | undefined>(undefined);
  const [message, setMessage] = useState<ReactNode>("");
  const [readyError, setReadyError] = useState("");
  const notice = useCallback((s: ReactNode) => setMessage(s), []);
  useEffect(() => {
    let active = true;
    adminRequest<{ user: SafeUser }>("session")
      .then((r) => {
        if (active) setUser(r.user);
      })
      .catch((e) => {
        if (active) {
          setUser(null);
          if (!(e as Error).message.includes("להתחבר")) setReadyError((e as Error).message);
        }
      });
    const expired = () => setUser(null);
    window.addEventListener("admin:unauthorized", expired);
    return () => {
      active = false;
      window.removeEventListener("admin:unauthorized", expired);
    };
  }, []);
  const tabs = [
    ["home", "בית", Home],
    ["products", "מוצרים", Box],
    ["orders", "הזמנות", ClipboardList],
    ["promotions", "מבצעים", Tag],
    ["more", "עוד", MoreHorizontal],
  ] as const;
  return (
    <div className="admin-app" dir="rtl">
      <header className="ad-header">
        <img src="/brand/logo.jpg" alt="חזי אורקור" />
        <div>
          <b>חזי אורקור</b>
          <small>ניהול החנות</small>
        </div>
        <span className="ad-role">
          <ShieldCheck size={16} />
          {user?.role === "owner" ? "בעלים" : user ? "עובד" : "כניסה"}
        </span>
        {user && (
          <button
            aria-label="התנתקות"
            className="ad-icon"
            onClick={() => {
              void adminRequest("logout", "POST", {})
                .then(() => {
                  setUser(null);
                  setMessage("");
                })
                .catch((e) => notice((e as Error).message));
            }}
          >
            <LogOut size={18} />
          </button>
        )}
      </header>
      <div className="ad-local">
        {adminSnapshot().mode === "preview-demo"
          ? "מצב בדיקה · עריכות חנות זמניות בדפדפן הזה · ללא נתוני לקוחות אמיתיים"
          : adminSnapshot().mode === "git"
            ? "מצב Git · שמירה מפעילה פריסה · במאגר ציבורי ההזמנות זמניות בלבד; אין להזין פרטי לקוחות אמיתיים"
            : "מצב מקומי · הנתונים נשמרים במחשב השרת בלבד · לא מחובר לפרודקשן"}
      </div>
      <main className="ad-main">
        {message && (
          <div role="status" className="ad-alert">
            <span>{message}</span>
            <button aria-label="סגירת הודעה" onClick={() => setMessage("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {readyError && !user && <div className="ad-alert">{readyError}</div>}
        {user === undefined ? (
          <Login checking onLogin={setUser} notice={notice} />
        ) : !user ? (
          <Login onLogin={setUser} notice={notice} />
        ) : (
          <>
            {section === "home" ? (
              <DashboardHome user={user} notice={notice} />
            ) : section === "products" ? (
              <Products user={user} notice={notice} />
            ) : section === "promotions" ? (
              <Promotions user={user} notice={notice} />
            ) : section === "orders" ? (
              <Orders user={user} notice={notice} />
            ) : section === "homepage" ? (
              <HomepageEditor user={user} notice={notice} />
            ) : section === "users" ? (
              <UserPermissions user={user} notice={notice} />
            ) : section === "audit" ? (
              <Audit user={user} notice={notice} />
            ) : (
              <More user={user} />
            )}
          </>
        )}
      </main>
      {user && (
        <nav className="ad-nav" aria-label="ניווט ניהול">
          {tabs.map(([key, label, Icon]) => (
            <Link
              key={key}
              to={key === "home" ? "/admin" : (`/admin/${key}` as "/admin")}
              className={
                section === key ||
                (key === "more" && ["homepage", "users", "audit"].includes(section))
                  ? "active"
                  : ""
              }
            >
              <Icon size={21} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
function Heading({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
  return (
    <div className="ad-heading">
      <div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {children}
    </div>
  );
}
function DashboardHome({ user, notice }: { user: SafeUser; notice: Notice }) {
  const [data, setData] = useState<{
    waiting: number | null;
    missingImages: number;
    missingPrices: number;
    activePromotions: number;
    products: number;
    recentAudit: AuditEntry[];
  }>();
  useEffect(() => {
    adminRequest<typeof data>("dashboard")
      .then(setData)
      .catch((e) => notice(e.message));
  }, [notice]);
  const stats = [
    ["הזמנות ממתינות", data?.waiting, ClipboardList],
    ["ללא תמונה", data?.missingImages, ImagePlus],
    ["ללא מחיר", data?.missingPrices, Tag],
    ["מבצעים פעילים", data?.activePromotions, Bell],
  ] as const;
  return (
    <>
      <Heading title={`שלום, ${user.name}`} sub="כל החנות בידיים שלך." />
      <div className="ad-grid ad-stats">
        {stats.map(([label, n, Icon]) => (
          <div className="ad-card" key={label}>
            <div className="ad-row ad-between">
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong>{n == null ? "—" : n.toLocaleString("he-IL")}</strong>
            <small>
              {!data
                ? "טוען…"
                : label === "הזמנות ממתינות" && n === null
                  ? "אין הרשאת הזמנות"
                  : "נתון מקומי מעודכן"}
            </small>
          </div>
        ))}
      </div>
      <h2 className="ad-section-title">מה עושים עכשיו?</h2>
      <div className="ad-grid ad-actions">
        {[
          ["products", "עדכון מוצרים", Box, "products"],
          ["products", "עדכון מחיר", Pencil, "prices"],
          ["orders", "טיפול בהזמנה", ClipboardList, "orders"],
          ["promotions", "יצירת מבצע", Tag, "promotions"],
          ["homepage", "עריכת דף הבית", Home, "homepage"],
          ["users", "צוות והרשאות", Users, "owner"],
        ]
          .filter(([, , , p]) =>
            p === "owner" ? user.role === "owner" : allowed(user, p as Permission),
          )
          .map(([path, label, Icon]) => {
            const I = Icon as typeof Box;
            return (
              <Link to={`/admin/${path}` as "/admin"} className="ad-action" key={String(label)}>
                <I size={22} />
                {String(label)}
              </Link>
            );
          })}
      </div>
      <div className="ad-card ad-note">
        {data?.products.toLocaleString("he-IL")} מוצרים גלויים. שינויים במחירים נשמרים כשכבה נפרדת
        עם יומן ביקורת; קובצי המחירים המקוריים אינם משתנים.
      </div>
      {user.role === "owner" && (
        <>
          <h2 className="ad-section-title">פעילות אחרונה</h2>
          <div className="ad-card">
            {data?.recentAudit.slice(0, 5).map((a) => (
              <div className="ad-audit-row" key={a.id}>
                <b>{a.actor}</b>
                <span>{actionLabel(a.action)}</span>
                <small>{time(a.at)} · שעון ישראל</small>
              </div>
            ))}
            <Link to={"/admin/audit" as "/admin"}>יומן שינויים מלא ←</Link>
          </div>
        </>
      )}
    </>
  );
}
type AdminProduct = Product & {
  price: number | null;
  regularPrice: number | null;
  basePrice: number | null;
  hidden: boolean;
  brand: string;
  priceProtected: boolean;
};
function Products({ user, notice }: { user: SafeUser; notice: Notice }) {
  const [creating, setCreating] = useState(false);
  const [sub, setSub] = useState("");
  const [description, setDescription] = useState("");
  const [vehicleFitment, setVehicleFitment] = useState("");
  const [inStock, setInStock] = useState(true);
  const [q, setQ] = useState("");
  const [newSku, setNewSku] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<{ items: AdminProduct[]; total: number; pages: number }>();
  const [selected, setSelected] = useState<AdminProduct>();
  const [editMessage, setEditMessage] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const listQuery = `products?q=${encodeURIComponent(q)}&filter=${filter}&page=${page}&pin=${encodeURIComponent(newSku)}`;
  const latestQuery = useRef(listQuery);
  latestQuery.current = listQuery;
  const reload = useCallback(
    () =>
      adminRequest<typeof list>(listQuery)
        .then((result) => {
          if (latestQuery.current === listQuery) setList(result);
        })
        .catch((e) => notice(e.message)),
    [listQuery, notice],
  );
  useEffect(() => {
    if (!allowed(user, "products")) return;
    const t = setTimeout(() => {
      void reload();
    }, 250);
    return () => clearTimeout(t);
  }, [reload, user]);
  function edit(p: AdminProduct) {
    setEditMessage("");
    setSelected(p);
    setName(p.name);
    setBrand(p.brand);
    setCategory(p.category);
    setPrice(p.regularPrice == null ? "" : String(p.regularPrice));
    setHidden(p.hidden);
    setSub(p.subcategory || "");
    setDescription(p.description || "");
    setVehicleFitment(p.vehicleFitment || "");
    setInStock(p.inStock ?? true);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const nextPrice = price === "" ? null : Number(price);
      const patch = {
        ...(selected.adminCreated ? { sub, description, vehicleFitment, inStock } : {}),
        ...(name !== selected.name ? { name } : {}),
        ...(category !== selected.category ? { category } : {}),
        ...(hidden !== selected.hidden ? { hidden } : {}),
        ...(brand !== selected.brand ? { brand } : {}),
        ...(allowed(user, "prices") &&
        !selected.priceProtected &&
        nextPrice !== selected.regularPrice
          ? { price: nextPrice }
          : {}),
      };
      if (!Object.keys(patch).length) {
        setSelected(undefined);
        notice("אין שינויים נוספים לשמירה");
        return;
      }
      await adminRequest(`products/${selected.sku}`, "PATCH", patch);
      await refreshAdminOverlay(true);
      notice("השינויים נשמרו בשכבת הניהול; המקור לא השתנה");
      setSelected(undefined);
      await reload();
    } catch (e) {
      setEditMessage((e as Error).message);
      notice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file || !selected) return;
    setBusy(true);
    try {
      const r = await adminRequest<{ image: string }>(`products/${selected.sku}/image`, "POST", {
        base64: await readUpload(file),
      });
      setSelected({ ...selected, image: r.image });
      await refreshAdminOverlay(true);
      setEditMessage("תמונת המוצר נשמרה");
      notice("תמונת המוצר נשמרה");
      await reload();
    } catch (e) {
      setEditMessage((e as Error).message);
      notice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!allowed(user, "products")) return <Denied />;
  return (
    <>
      <Heading title="מוצרים" sub="חיפוש, תמונות ועדכונים מהירים." />
      {allowed(user, "add-products") && (
        <Action onClick={() => setCreating(true)}>
          <Plus size={18} />
          הוסף מוצר
        </Action>
      )}
      {creating && (
        <AdminCreateProduct
          onClose={() => setCreating(false)}
          onCreated={(sku) => {
            setCreating(false);
            setQ("");
            setFilter("");
            setPage(1);
            setNewSku(sku);
            setList(undefined);
            notice(
              <>
                המוצר נוסף; כל המוצרים עדיין ברשימה.{" "}
                <Link to="/product/$id" params={{ id: sku }}>
                  הצג מוצר
                </Link>
              </>,
            );
          }}
        />
      )}
      <div className="ad-search">
        <Search size={19} />
        <input
          aria-label="חיפוש מוצרים לפי מק״ט או OE"
          placeholder="שם מוצר, מק״ט שלנו או OE"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="ad-chips">
        {[
          ["", "הכול"],
          ["no-image", "חסרה תמונה"],
          ["no-price", "חסר מחיר"],
          ["hidden", "מוסתרים"],
        ].map(([v, t]) => (
          <button
            className={filter === v ? "active" : ""}
            key={v}
            onClick={() => {
              setFilter(v);
              setPage(1);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {(q.trim() || filter) && (
        <button
          className="ad-filter-indicator"
          onClick={() => {
            setQ("");
            setFilter("");
            setPage(1);
          }}
        >
          מסונן:{" "}
          <bdi>
            {q.trim() ||
              (
                { "no-image": "חסרה תמונה", "no-price": "חסר מחיר", hidden: "מוסתרים" } as Record<
                  string,
                  string
                >
              )[filter]}
          </bdi>
          {q.trim() && filter ? " · מסנן נוסף" : ""} · נקה
        </button>
      )}
      <p className="ad-note" aria-live="polite">
        {list
          ? `${list.total.toLocaleString("he-IL")} ${list.total === 1 ? "מוצר" : "מוצרים"}`
          : "טוען מוצרים…"}
      </p>
      <div className="ad-card ad-product-list">
        {list?.items.map((p) => (
          <button
            className={`ad-product-row ${p.sku === newSku ? "ad-product-new" : ""}`}
            onClick={() => edit(p)}
            key={p.sku}
          >
            <div className="ad-product-photo">
              {p.image ? <img src={p.image} alt="" /> : <ImagePlus size={25} />}
            </div>
            <div>
              <b>{p.name}</b> {p.sku === newSku && <span className="ad-badge">חדש</span>}
              <small>
                <bdi>{p.sku}</bdi> · {p.brand || "מותג לא צוין"}
              </small>
              <div className="ad-row">
                <strong>{money(p.price)}</strong>
                <span className={`ad-badge ${p.hidden ? "orange" : ""}`}>
                  {p.hidden ? "מוסתר" : "מוצג באתר"}
                </span>
              </div>
            </div>
            <Pencil size={17} />
          </button>
        ))}
      </div>
      {list?.items.length === 0 && <Empty text="לא נמצאו מוצרים" />}
      <div className="ad-row ad-pagination">
        <Action secondary disabled={page === 1} onClick={() => setPage(page - 1)}>
          הקודם
        </Action>
        <span>
          עמוד {page} / {Math.max(1, list?.pages || 1)}
        </span>
        <Action secondary disabled={!list || page >= list.pages} onClick={() => setPage(page + 1)}>
          הבא
        </Action>
      </div>
      {selected && (
        <Dialog.Root
          open
          onOpenChange={(open) => {
            if (!open) setSelected(undefined);
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="ad-modal-backdrop">
              <Dialog.Content className="ad-sheet">
                <Dialog.Description className="sr-only">
                  עדכון מוצר קיים בשכבת הניהול המקומית.
                </Dialog.Description>
                <div className="ad-handle" />
                <div className="ad-row ad-between">
                  <div>
                    <Dialog.Title className="text-xl font-bold">עריכה מהירה</Dialog.Title>
                    <small>
                      <bdi>{selected.sku}</bdi>
                    </small>
                  </div>
                  <button
                    className="ad-icon"
                    aria-label="סגירת עריכה"
                    onClick={() => setSelected(undefined)}
                  >
                    <X />
                  </button>
                </div>
                {editMessage && (
                  <p className="ad-alert" role="alert">
                    {editMessage}
                  </p>
                )}
                <form onSubmit={save}>
                  <Field label="שם מוצר">
                    <textarea
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={300}
                    />
                  </Field>
                  <div className="ad-grid">
                    <Field label="מחיר כולל מע״מ">
                      <input
                        aria-label="מחיר מוצר"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={price}
                        disabled={!allowed(user, "prices") || selected.priceProtected}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="ריק = הצעת מחיר"
                      />
                    </Field>
                    <Field label="קטגוריה">
                      <select
                        value={category}
                        onChange={(e) => {
                          setCategory(e.target.value);
                          setSub("");
                        }}
                      >
                        {displayCategories.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  {selected.adminCreated && (
                    <>
                      <Field label="תת־קטגוריה">
                        <select value={sub} onChange={(e) => setSub(e.target.value)}>
                          <option value="">ללא תת־קטגוריה</option>
                          {(subcategories[category] || []).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="תיאור">
                        <textarea
                          maxLength={3000}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </Field>
                      <Field label="התאמה לרכב">
                        <textarea
                          maxLength={1000}
                          value={vehicleFitment}
                          onChange={(e) => setVehicleFitment(e.target.value)}
                        />
                      </Field>
                      <Toggle checked={inStock} onChange={setInStock} label="במלאי" />
                    </>
                  )}
                  <Field label="מותג יצרן מאומת (לא מותג חלופי מרשימת OE)">
                    <input
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      maxLength={60}
                    />
                  </Field>
                  {selected.priceProtected && (
                    <p className="ad-note">מחיר מוגן בהחרגה הקיימת. אין אפשרות לשנותו במסך זה.</p>
                  )}
                  <Toggle checked={hidden} onChange={setHidden} label="הסתרת המוצר מהאתר" />
                  <div className="ad-upload">
                    {selected.image && <img src={selected.image} alt="תמונת מוצר" />}
                    <label>
                      העלאת צילום אמיתי
                      <input
                        aria-label="העלאת תמונת מוצר"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={busy}
                        onChange={(e) => {
                          void upload(e.target.files?.[0]);
                        }}
                      />
                    </label>
                  </div>
                  <p className="ad-note">
                    תמונה עד 2MB · העלאת תמונה נשמרת מיד. יתר השדות נשמרים בכפתור.
                  </p>
                  <Action type="submit" disabled={busy}>
                    <Check size={18} />
                    שמירת שינויים
                  </Action>
                </form>
              </Dialog.Content>
            </Dialog.Overlay>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );
}
function israelInput(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(iso))
    .replace(" ", "T");
}
function israelIso(input: string) {
  const t = Date.parse(input + "Z");
  let guess = t;
  for (let i = 0; i < 2; i++) {
    const rendered = israelInput(new Date(guess).toISOString());
    guess = t - (Date.parse(rendered + "Z") - guess);
  }
  return new Date(guess).toISOString();
}
function newPromo(): Promotion {
  return {
    id: "",
    title: "",
    targetType: "product",
    target: "",
    kind: "percent",
    value: 10,
    start: new Date().toISOString(),
    end: new Date(Date.now() + 7 * 86400000).toISOString(),
    badge: "מבצע השבוע",
    homepage: false,
    enabled: true,
  };
}
function Promotions({ user, notice }: { user: SafeUser; notice: Notice }) {
  const [list, setList] = useState<Promotion[]>([]);
  const [form, setForm] = useState<Promotion>(newPromo);
  const [preview, setPreview] = useState<Product>();
  const [busy, setBusy] = useState(false);
  const reload = useCallback(
    () =>
      adminRequest<Promotion[]>("promotions")
        .then(setList)
        .catch((e) => notice(e.message)),
    [notice],
  );
  useEffect(() => {
    if (allowed(user, "promotions")) void reload();
  }, [reload, user]);
  useEffect(() => {
    let active = true;
    if (form.targetType !== "product") {
      setPreview(undefined);
      return;
    }
    void loadProduct(form.target).then((p) => {
      if (active) setPreview(p);
    });
    return () => {
      active = false;
    };
  }, [form.target, form.targetType]);
  function update<K extends keyof Promotion>(key: K, value: Promotion[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { id, ...fields } = form;
      await adminRequest("promotions", "POST", { ...fields, ...(id ? { id } : {}) });
      await refreshAdminOverlay(true);
      notice("המבצע נשמר. הוא מוצג בחנות רק בטווח התאריכים הפעיל.");
      await reload();
      setForm(newPromo());
    } catch (e) {
      notice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const regular = preview ? regularCatalogPrice(preview.sku) : null;
  const sale =
    regular == null
      ? null
      : form.kind === "percent"
        ? Math.round(regular * (1 - form.value / 100) * 100) / 100
        : form.value;
  if (!allowed(user, "promotions")) return <Denied />;
  return (
    <>
      <Heading title="מבצעים" sub="מחיר מיוחד, בלי לאבד שליטה." />
      <div className="ad-stack">
        {list.map((p) => (
          <button
            className="ad-card ad-row ad-between ad-text-button"
            key={p.id}
            onClick={() => setForm(p)}
          >
            <div>
              <b>{p.title}</b>
              <small>
                {p.target} · עד {time(p.end)}
              </small>
            </div>
            <span className="ad-badge">
              {!p.enabled
                ? "כבוי"
                : Date.parse(p.end) <= Date.now()
                  ? "הסתיים"
                  : Date.parse(p.start) > Date.now()
                    ? "מתוזמן"
                    : "פעיל"}
            </span>
          </button>
        ))}
      </div>
      <h2 className="ad-section-title">{form.id ? "עריכת מבצע" : "יצירת מבצע"}</h2>
      <form className="ad-card" onSubmit={save}>
        <Field label="שם המבצע לניהול">
          <input
            required
            maxLength={100}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </Field>
        <div className="ad-segment">
          {[
            ["product", "מוצר"],
            ["category", "קטגוריה"],
            ["brand", "מותג"],
          ].map(([v, t]) => (
            <button
              type="button"
              key={v}
              className={form.targetType === v ? "active" : ""}
              onClick={() =>
                setForm((f) => ({ ...f, targetType: v as Promotion["targetType"], target: "" }))
              }
            >
              {t}
            </button>
          ))}
        </div>
        <Field
          label={
            form.targetType === "product"
              ? "מק״ט מוצר"
              : form.targetType === "category"
                ? "קטגוריה"
                : "מותג מדויק"
          }
        >
          {form.targetType === "category" ? (
            <select value={form.target} required onChange={(e) => update("target", e.target.value)}>
              <option value="">בחירת קטגוריה</option>
              {displayCategories.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={form.target}
              required
              onChange={(e) => update("target", e.target.value)}
              placeholder={form.targetType === "product" ? "HZ-BRK-00001" : "MOTUL"}
              dir="ltr"
            />
          )}
        </Field>
        {form.targetType === "brand" && (
          <p className="ad-note">
            התאמה רק למותג מפורש בשם המקורי או למותג שאומת בעריכת המוצר. לא מנחשים יצרן מרשימת OE.
          </p>
        )}
        <div className="ad-grid">
          <Field label="סוג ההנחה">
            <select
              value={form.kind}
              onChange={(e) => update("kind", e.target.value as Promotion["kind"])}
            >
              <option value="percent">הנחה באחוזים</option>
              <option value="fixed">מחיר מבצע קבוע</option>
            </select>
          </Field>
          <Field label={form.kind === "percent" ? "הנחה %" : "מחיר קבוע ₪"}>
            <input
              type="number"
              min="0.01"
              max={form.kind === "percent" ? 99.99 : 1_000_000}
              step="0.01"
              value={form.value}
              required
              onChange={(e) => update("value", Number(e.target.value))}
            />
          </Field>
        </div>
        <div className="ad-grid ad-promo-dates">
          <Field label="התחלה · שעון ישראל">
            <input
              type="datetime-local"
              dir="ltr"
              value={israelInput(form.start)}
              required
              onChange={(e) => e.target.value && update("start", israelIso(e.target.value))}
            />
          </Field>
          <Field label="סיום · שעון ישראל">
            <input
              type="datetime-local"
              dir="ltr"
              value={israelInput(form.end)}
              required
              onChange={(e) => e.target.value && update("end", israelIso(e.target.value))}
            />
          </Field>
        </div>
        <Field label="טקסט על תג המבצע">
          <input
            value={form.badge}
            maxLength={40}
            required
            onChange={(e) => update("badge", e.target.value)}
          />
        </Field>
        <Toggle label="המבצע פעיל" checked={form.enabled} onChange={(v) => update("enabled", v)} />
        <Toggle
          label="באנר מבצע בדף הבית"
          checked={form.homepage}
          onChange={(v) => update("homepage", v)}
        />
        <div className="ad-preview">
          <small>תצוגה מקדימה · מחירים כוללים מע״מ</small>
          {preview ? (
            <div className="ad-product-row">
              <div className="ad-product-photo">
                {preview.image && <img src={preview.image} alt="" />}
              </div>
              <div>
                <span className="ad-sale-badge">{form.badge}</span>
                <b>{preview.name}</b>
                <strong className="ad-sale-price">{money(sale)}</strong> <del>{money(regular)}</del>
              </div>
            </div>
          ) : (
            <p>
              {form.targetType === "product"
                ? "הזינו מק״ט תקין כדי לראות כרטיס מוצר"
                : `תג ״${form.badge}״ יוצג על מוצרים מתאימים, לפי ${form.targetType === "brand" ? "המותג" : "הקטגוריה"} שנבחרו.`}
            </p>
          )}
        </div>
        <p className="ad-note">
          אין כפל מבצעים: הראשון הפעיל ברשימה קובע. מבצע לא מעלה מחיר רגיל ולא מחליף הצעת מחיר.
        </p>
        <Action type="submit" disabled={busy}>
          <Check size={18} />
          שמירה ופרסום מבצע
        </Action>
        {form.id && (
          <Action secondary onClick={() => setForm(newPromo())}>
            יצירת מבצע נוסף
          </Action>
        )}
      </form>
    </>
  );
}
function Orders({ user, notice }: { user: SafeUser; notice: Notice }) {
  const [list, setList] = useState<StoredOrder[]>();
  const [status, setStatus] = useState<"waiting" | "handled" | "all">("waiting");
  const [selected, setSelected] = useState<string>();
  const [q, setQ] = useState("");
  const reload = useCallback(
    () =>
      adminRequest<StoredOrder[]>("orders")
        .then(setList)
        .catch((e) => notice(e.message)),
    [notice],
  );
  useEffect(() => {
    if (allowed(user, "orders")) void reload();
  }, [reload, user]);
  async function mark(id: string, value: "waiting" | "handled") {
    try {
      await adminRequest(`orders/${id}`, "PATCH", { status: value });
      await reload();
      notice("סטטוס ההזמנה עודכן");
    } catch (e) {
      notice((e as Error).message);
    }
  }
  if (!allowed(user, "orders")) return <Denied />;
  const current = list?.find((o) => o.id === selected);
  return (
    <>
      <Heading title="הזמנות" sub="בקשות שנוצרו בעת ניסיון שיתוף PDF." />
      <div className="ad-search">
        <Search size={18} />
        <input
          aria-label="חיפוש הזמנות"
          placeholder="שם, טלפון או מספר הזמנה"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="ad-chips">
        {[
          ["waiting", "ממתין"],
          ["handled", "טופל"],
          ["all", "הכול"],
        ].map(([v, t]) => (
          <button
            key={v}
            className={status === v ? "active" : ""}
            onClick={() => setStatus(v as typeof status)}
          >
            {t} {v === "all" ? "" : list?.filter((o) => o.status === v).length}
          </button>
        ))}
      </div>
      {!list ? (
        <Loading />
      ) : !list.length ? (
        <Empty text="אין עדיין הזמנות. רשומה נוצרת כשלקוח מנסה לשלוח PDF מהסל במצב מקומי." />
      ) : (
        <div className="ad-stack">
          {list
            .filter(
              (o) =>
                (status === "all" || o.status === status) &&
                [o.ref, o.customer.name, o.customer.phone].join(" ").includes(q),
            )
            .map((o) => (
              <button
                className={`ad-card ad-text-button ${selected === o.id ? "ad-selected" : ""}`}
                key={o.id}
                onClick={() => setSelected(o.id)}
              >
                <div className="ad-row ad-between">
                  <b>{o.customer.name}</b>
                  <span className={`ad-badge ${o.status === "waiting" ? "orange" : ""}`}>
                    {o.status === "waiting" ? "ממתין" : "טופל"}
                  </span>
                </div>
                <small>
                  <bdi>{o.ref}</bdi> · {o.lines.length} פריטים · {time(o.createdAt)}
                </small>
                <div className="ad-row ad-between">
                  <span className="ad-note">ניסיון שיתוף PDF / וואטסאפ</span>
                  <strong>{money(o.subtotal)}</strong>
                </div>
              </button>
            ))}
        </div>
      )}
      {current && (
        <section className="ad-card ad-order-detail">
          <h2>פרטי ההזמנה</h2>
          <small>
            <bdi>{current.ref}</bdi>
          </small>
          <dl className="ad-grid">
            <div>
              <dt>שם</dt>
              <dd>{current.customer.name}</dd>
            </div>
            <div>
              <dt>טלפון</dt>
              <dd>
                <bdi>{current.customer.phone}</bdi>
              </dd>
            </div>
            <div>
              <dt>רכב / מספר רישוי</dt>
              <dd>
                {current.customer.make} {current.customer.model} <bdi>{current.customer.plate}</bdi>
              </dd>
            </div>
            <div>
              <dt>שיטת קבלה</dt>
              <dd>{current.customer.delivery || "לא נבחר"}</dd>
            </div>
          </dl>
          {current.lines.map((l, i) => (
            <div className="ad-order-line" key={i}>
              <div>
                <b>{l.name}</b>
                <small>
                  <bdi>{l.sku}</bdi> · {l.qty} × {money(l.price)}
                </small>
              </div>
              <strong>{money(l.total)}</strong>
            </div>
          ))}
          <div className="ad-row ad-between">
            <b>סכום ביניים</b>
            <strong>{money(current.subtotal)}</strong>
          </div>
          {current.quoteCount > 0 && <p>ועוד {current.quoteCount} פריטים בהצעת מחיר</p>}
          {current.customer.notes && <p className="ad-note">הערות: {current.customer.notes}</p>}
          <div className="ad-row ad-wrap ad-order-buttons">
            {current.pdfFile && (
              <a className="ad-button ad-secondary" href={`/api/admin/orders/${current.id}/pdf`}>
                הורדת PDF
              </a>
            )}
            <a
              className="ad-button ad-secondary"
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/${current.customer.phone.replace(/^0/, "972").replace(/\D/g, "")}`}
            >
              שיחת וואטסאפ
            </a>
          </div>
          <Action
            onClick={() => {
              void mark(current.id, current.status === "waiting" ? "handled" : "waiting");
            }}
          >
            <Check size={18} />
            {current.status === "waiting" ? "סימון ההזמנה כטופלה" : "החזרה לממתין"}
          </Action>
          <p className="ad-note">
            רשומה זו מעידה על ניסיון שיתוף בלבד, לא על משלוח/מסירה בוואטסאפ או על תשלום. טלפונים
            ורשומות לקוח אינם גלויים בחנות.
          </p>
        </section>
      )}
    </>
  );
}
function HomepageEditor({ user, notice }: { user: SafeUser; notice: Notice }) {
  const [home, setHome] = useState<HomeSettings>();
  const [sku, setSku] = useState("");
  const [drag, setDrag] = useState<number>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (allowed(user, "homepage"))
      void adminRequest<HomeSettings>("homepage")
        .then((h) =>
          setHome({
            ...h,
            categoryOrder: [
              ...h.categoryOrder.filter((id) => id !== "workshop-packs"),
              ...displayCategories
                .map((c) => c.id)
                .filter((c) => c !== "workshop-packs" && !h.categoryOrder.includes(c)),
            ],
          }),
        )
        .catch((e) => notice(e.message));
  }, [user, notice]);
  function move(from: number, to: number) {
    setHome((h) => {
      if (!h || to < 0 || to >= h.categoryOrder.length) return h;
      const a = [...h.categoryOrder];
      a.splice(to, 0, a.splice(from, 1)[0]);
      return { ...h, categoryOrder: a };
    });
  }
  function banner(id: string, patch: Partial<Banner>) {
    setHome((h) =>
      h ? { ...h, banners: h.banners.map((b) => (b.id === id ? { ...b, ...patch } : b)) } : h,
    );
  }
  async function publish() {
    if (!home) return;
    setBusy(true);
    try {
      await adminRequest("homepage", "PUT", home);
      await refreshAdminOverlay(true);
      notice("שינויי דף הבית פורסמו בשכבה המקומית");
    } catch (e) {
      notice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function addFeatured() {
    if (!home || !sku) return;
    try {
      const p = await loadProduct(sku);
      if (!p) throw new Error("מק״ט לא קיים או מוסתר");
      setHome({ ...home, featuredSkus: [...new Set([...(home.featuredSkus || []), p.sku])] });
      setSku("");
    } catch (e) {
      notice((e as Error).message);
    }
  }
  if (!allowed(user, "homepage")) return <Denied />;
  if (!home) return <Loading />;
  return (
    <>
      <Heading title="עריכת דף הבית" sub="באנרים, מוצרים וסדר התצוגה." />
      <div className="ad-row ad-wrap">
        <a className="ad-button ad-secondary" href="/" target="_blank" rel="noreferrer">
          פתיחת החנות
        </a>
        <Action
          onClick={() => {
            void publish();
          }}
          disabled={busy}
        >
          פרסום שינויים
        </Action>
      </div>
      <h2 className="ad-section-title">באנרים</h2>
      {home.banners.map((b) => (
        <div className="ad-card ad-banner-form" key={b.id}>
          <Toggle
            label="הצגת הבאנר"
            checked={b.enabled}
            onChange={(v) => banner(b.id, { enabled: v })}
          />
          <Field label="כותרת">
            <input
              maxLength={100}
              value={b.title}
              onChange={(e) => banner(b.id, { title: e.target.value })}
            />
          </Field>
          <Field label="טקסט">
            <input
              maxLength={250}
              value={b.text}
              onChange={(e) => banner(b.id, { text: e.target.value })}
            />
          </Field>
          <Field label="קישור פנימי">
            <input
              dir="ltr"
              value={b.href}
              onChange={(e) => banner(b.id, { href: e.target.value })}
            />
          </Field>
          <label className="ad-field">
            צילום לבאנר (עד 2MB)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  void readUpload(file)
                    .then((base64) =>
                      adminRequest<{ image: string }>("homepage/image", "POST", { base64 }),
                    )
                    .then((r) => banner(b.id, { image: r.image }))
                    .catch((e) => notice(e.message));
              }}
            />
          </label>
          <div className="ad-banner-preview">
            {b.image && (
              <img
                src={b.image}
                alt="תמונת הבאנר"
                style={{
                  width: 100,
                  height: 90,
                  objectFit: "contain",
                  float: "left",
                  borderRadius: 10,
                }}
              />
            )}
            <h2>{b.title}</h2>
            <p>{b.text}</p>
            <span>למוצרים ←</span>
          </div>
          <Action
            secondary
            onClick={() => setHome({ ...home, banners: home.banners.filter((x) => x.id !== b.id) })}
          >
            הסרת הבאנר מהטיוטה
          </Action>
        </div>
      ))}
      <Action
        secondary
        disabled={home.banners.length >= 5}
        onClick={() =>
          setHome({
            ...home,
            banners: [
              ...home.banners,
              {
                id: crypto.randomUUID(),
                title: "כותרת חדשה",
                text: "",
                href: "/results",
                enabled: true,
              },
            ],
          })
        }
      >
        <Plus size={18} />
        הוספת באנר
      </Action>
      <h2 className="ad-section-title">מוצרים מומלצים</h2>
      <div className="ad-card">
        <div className="ad-row">
          <input
            aria-label="מק״ט למוצר מומלץ"
            dir="ltr"
            placeholder="HZ-BRK-00001"
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
          />
          <Action
            secondary
            onClick={() => {
              void addFeatured();
            }}
          >
            הוספה
          </Action>
        </div>
        {home.featuredSkus === undefined && (
          <p className="ad-note">כעת מוצגת ברירת המחדל מהקטלוג. הוספת מק״ט תיצור רשימה ייעודית.</p>
        )}
        {home.featuredSkus?.map((s, i) => (
          <div className="ad-row ad-featured-row" key={s}>
            <bdi>{s}</bdi>
            <button
              className="ad-icon"
              aria-label={`הסר ${s}`}
              onClick={() =>
                setHome({ ...home, featuredSkus: home.featuredSkus?.filter((x) => x !== s) })
              }
            >
              <X size={18} />
            </button>
            <button
              className="ad-icon"
              disabled={i === 0}
              aria-label={`העבר ${s} למעלה`}
              onClick={() => {
                const a = [...(home.featuredSkus || [])];
                [a[i - 1], a[i]] = [a[i], a[i - 1]];
                setHome({ ...home, featuredSkus: a });
              }}
            >
              <ChevronUp size={18} />
            </button>
          </div>
        ))}
      </div>
      <h2 className="ad-section-title">סדר הקטגוריות</h2>
      <p className="ad-note">גררו מהידית או השתמשו בחצים. מחירי מוסך נשאר כפתור נפרד.</p>
      <div className="ad-card">
        {home.categoryOrder
          .filter((id) => id !== "workshop-packs")
          .map((id) => {
            const i = home.categoryOrder.indexOf(id);
            return (
              <div
                className={`ad-category-row ${drag === i ? "dragging" : ""}`}
                key={id}
                data-category-index={i}
                draggable
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (drag !== undefined) move(drag, i);
                  setDrag(undefined);
                }}
              >
                <button
                  className="ad-icon ad-drag-handle"
                  aria-label={`גרירת ${id}`}
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => {
                    setDrag(i);
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerUp={(e) => {
                    const el = document
                      .elementFromPoint(e.clientX, e.clientY)
                      ?.closest("[data-category-index]");
                    if (el && drag !== undefined)
                      move(drag, Number(el.getAttribute("data-category-index")));
                    setDrag(undefined);
                  }}
                >
                  <GripVertical size={19} />
                </button>
                <b>{displayCategories.find((c) => c.id === id)?.name}</b>
                <span className="ad-grow" />
                <button
                  className="ad-icon"
                  aria-label={`העבר ${id} למעלה`}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  className="ad-icon"
                  aria-label={`העבר ${id} למטה`}
                  disabled={i === home.categoryOrder.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            );
          })}
      </div>
      <p className="ad-note">עד ״פרסום שינויים״, העריכות במסך הן טיוטה בדפדפן בלבד.</p>
      <Action
        disabled={busy}
        onClick={() => {
          void publish();
        }}
      >
        פרסום שינויים
      </Action>
    </>
  );
}
function UserPermissions({ user, notice }: { user: SafeUser; notice: Notice }) {
  const [list, setList] = useState<SafeUser[]>([]);
  const [form, setForm] = useState<{
    id?: string;
    username: string;
    name: string;
    role: "employee";
    permissions: Permission[];
    active: boolean;
    password: string;
  }>({
    username: "",
    name: "",
    role: "employee",
    permissions: ["products", "orders"],
    active: true,
    password: "",
  });
  const reload = useCallback(
    () =>
      adminRequest<SafeUser[]>("users")
        .then(setList)
        .catch((e) => notice(e.message)),
    [notice],
  );
  useEffect(() => {
    if (user.role === "owner") void reload();
  }, [user, reload]);
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      const { password, ...rest } = form;
      await adminRequest("users", "POST", { ...rest, ...(password ? { password } : {}) });
      await reload();
      setForm({
        username: "",
        name: "",
        role: "employee",
        permissions: ["products", "orders"],
        active: true,
        password: "",
      });
      notice("המשתמש והרשאותיו נשמרו. התחברויות קודמות של העובד בוטלו.");
    } catch (e) {
      notice((e as Error).message);
    }
  }
  if (user.role !== "owner") return <Denied />;
  return (
    <>
      <Heading title="צוות והרשאות" sub="מחלקים עבודה, שומרים על שליטה." />
      <div className="ad-stack">
        {list.map((u) => (
          <div className="ad-card" key={u.id}>
            <div className="ad-row ad-between">
              <div>
                <b>{u.name}</b>
                <small>
                  <bdi>{u.username}</bdi>
                </small>
              </div>
              <span className="ad-badge">
                {u.role === "owner" ? "בעלים" : u.active ? "עובד פעיל" : "עובד כבוי"}
              </span>
            </div>
            {u.role === "employee" ? (
              <Action
                secondary
                onClick={() =>
                  setForm({
                    id: u.id,
                    username: u.username,
                    name: u.name,
                    role: "employee",
                    permissions: u.permissions,
                    active: u.active,
                    password: "",
                  })
                }
              >
                עריכת הרשאות
              </Action>
            ) : (
              <p className="ad-note">חשבון בעלים מוגן; סיסמתו מוגדרת בסביבה המקומית בלבד.</p>
            )}
          </div>
        ))}
      </div>
      <h2 className="ad-section-title">{form.id ? "עריכת עובד" : "הוספת עובד מקומי"}</h2>
      <form className="ad-card" onSubmit={save}>
        <Field label="שם העובד">
          <input
            required
            value={form.name}
            maxLength={80}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="שם משתמש באנגלית">
          <input
            required
            dir="ltr"
            pattern="[a-zA-Z0-9_-]{3,40}"
            autoComplete="off"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </Field>
        <Field label={form.id ? "סיסמה חדשה (ריק = ללא שינוי)" : "סיסמה ראשונית · 12 תווים לפחות"}>
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required={!form.id}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <p className="ad-note">
          תפקיד: עובד. אין הזמנה במייל או שירות אימות חיצוני מחובר. יש למסור את הסיסמה לעובד בערוץ
          מאובטח.
        </p>
        <Toggle
          label="העובד פעיל"
          checked={form.active}
          onChange={(v) => setForm({ ...form, active: v })}
        />
        {PERMISSIONS.map((p) => (
          <Toggle
            key={p}
            label={labels[p]}
            checked={form.permissions.includes(p)}
            disabled={
              (p === "prices" || p === "add-products") && !form.permissions.includes("products")
            }
            onChange={(v) =>
              setForm({
                ...form,
                permissions: v
                  ? [...form.permissions, p]
                  : form.permissions.filter(
                      (x) =>
                        x !== p && !(p === "products" && (x === "prices" || x === "add-products")),
                    ),
              })
            }
          />
        ))}
        <p className="ad-note">
          ניהול משתמשים והרשאות שמור לבעלים בלבד; ההרשאות נאכפות גם בשרת. הוספת מוצרים כוללת מחיר
          ראשוני למוצר חדש בלבד; שינוי מחיר קיים דורש הרשאת מחירים.
        </p>
        <Action type="submit">
          <Check size={18} />
          שמירת הרשאות
        </Action>
      </form>
    </>
  );
}
function More({ user }: { user: SafeUser }) {
  return (
    <>
      <Heading title="עוד בניהול" sub="תצוגה, צוות ובקרה." />
      <div className="ad-stack">
        {allowed(user, "homepage") && (
          <Link className="ad-action" to={"/admin/homepage" as "/admin"}>
            <Home />
            עריכת דף הבית
          </Link>
        )}
        {user.role === "owner" && (
          <>
            <Link className="ad-action" to={"/admin/users" as "/admin"}>
              <Users />
              צוות והרשאות
            </Link>
            <Link className="ad-action" to={"/admin/audit" as "/admin"}>
              <ShieldCheck />
              יומן שינויים
            </Link>
          </>
        )}
        <a className="ad-action" href="/" target="_blank" rel="noreferrer">
          פתיחת החנות ←
        </a>
      </div>
      <div className="ad-card ad-note">
        קובצי הקטלוג המקוריים נשארים לקריאה בלבד. אחסון וכניסת משתמשים לפרודקשן עדיין לא חוברו,
        ודורשים אישור בעלים.
      </div>
    </>
  );
}
function Audit({ user, notice }: { user: SafeUser; notice: Notice }) {
  const [rows, setRows] = useState<AuditEntry[]>();
  useEffect(() => {
    if (user.role === "owner")
      void adminRequest<AuditEntry[]>("audit")
        .then(setRows)
        .catch((e) => notice(e.message));
  }, [user, notice]);
  if (user.role !== "owner") return <Denied />;
  return (
    <>
      <Heading title="יומן שינויים" sub="מי שינה, מתי ומה היה לפני ואחרי." />
      {rows?.map((a) => (
        <details className="ad-card ad-audit-detail" key={a.id}>
          <summary>
            <b>{a.actor}</b> · {actionLabel(a.action)}
            <small>
              {time(a.at)} · שעון ישראל · <bdi>{a.target}</bdi>
            </small>
          </summary>
          <h3>לפני</h3>
          <pre dir="ltr">{JSON.stringify(a.before, null, 2)}</pre>
          <h3>אחרי</h3>
          <pre dir="ltr">{JSON.stringify(a.after, null, 2)}</pre>
        </details>
      ))}
    </>
  );
}
