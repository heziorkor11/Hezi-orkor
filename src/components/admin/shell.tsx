import { Link, Outlet, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { ADMIN_HOME, ADMIN_LOGIN, isAdminHomePath, normalizeAdminPath } from "@/lib/admin/paths";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { SafeUser } from "@/lib/admin/types";
import { adminFetch, type MeResponse } from "./api";

type Ctx = {
  user: SafeUser;
  mode: string;
  newOrders: number;
  refreshBadge: () => void;
  logout: () => Promise<void>;
};

const AdminCtx = createContext<Ctx | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error("useAdmin outside shell");
  return ctx;
}

const MASTER_NAV = [
  { to: ADMIN_HOME, label: "סקירה", ico: "⌂", end: true },
  { to: "/admin/orders", label: "הזמנות", ico: "▤", badge: true },
  { to: "/admin/products", label: "מוצרים", ico: "▣" },
  { to: "/admin/categories", label: "קטגוריות", ico: "☰", master: true },
  { to: "/admin/tags", label: "תגים ומבצעים", ico: "★", master: true },
  { to: "/admin/activity", label: "יומן פעילות", ico: "⌚" },
  { to: "/admin/users", label: "משתמשים והרשאות", ico: "👤", master: true },
  { to: "/admin/mail-preview", label: "דוא״ל והתראות", ico: "✉", master: true },
  { to: "/admin/sheets", label: "גיליון מוצרים", ico: "▦", master: true },
] as const;

export function AdminGate({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = pathname === "/admin/login" || pathname.startsWith("/admin/revert");
  const [user, setUser] = useState<SafeUser | null>(null);
  const [mode, setMode] = useState("disabled");
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [newOrders, setNewOrders] = useState(0);
  const [menu, setMenu] = useState(false);

  const router = useRouter();
  useEffect(() => {
    const clean = normalizeAdminPath(pathname);
    if (clean !== pathname) router.history.replace(clean);
  }, [pathname, router]);


  async function loadMe() {
    try {
      const me = await adminFetch<MeResponse>("/api/admin/me");
      setUser(me.user);
      setMode(me.mode || "");
      setReady(true);
      return me;
    } catch (err) {
      setBlocked(err instanceof Error ? err.message : "לוח הניהול כבוי בסביבה הזו");
      setReady(true);
      return null;
    }
  }

  async function refreshBadge() {
    try {
      const data = await adminFetch<{ newOrders?: number; counts?: { new: number } }>("/api/admin/home");
      setNewOrders(data.newOrders ?? data.counts?.new ?? 0);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void (async () => {
      const me = await loadMe();
      if (isPublic) return;
      if (!me) return;
      if (!me.user) {
        void navigate({ from: "/", to: ADMIN_LOGIN });
        return;
      }
      void refreshBadge();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function logout() {
    await adminFetch("/api/admin/logout", { method: "POST", body: "{}" });
    setUser(null);
    void navigate({ from: "/", to: ADMIN_LOGIN });
  }

  if (!ready) {
    return (
      <div className="admin-app">
        <div className="login-wrap">
          <p>טוען…</p>
        </div>
      </div>
    );
  }

  if (blocked && !isPublic) {
    return (
      <div className="admin-app">
        <div className="login-wrap">
          <div className="login-card">
            <h1>לוח הניהול כבוי</h1>
            <p className="lead">{blocked}</p>
            <p className="note">בסביבת התצוגה צריך להגדיר את משתני הסביבה המפורטים בתיעוד.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isPublic || !user) {
    return (
      <div className="admin-app" dir="rtl">
        {children ?? <Outlet />}
      </div>
    );
  }

  const nav = MASTER_NAV.filter((n) => !("master" in n && n.master) || user.role === "master");
  const initial = user.name.trim().slice(0, 1) || "מ";
  const titleMap: Record<string, string> = {
    "/admin": "סקירה",
    "/admin/": "סקירה",
    "/admin/orders": "הזמנות",
    "/admin/products": "מוצרים",
    "/admin/categories": "קטגוריות",
    "/admin/tags": "תגים ומבצעים",
    "/admin/activity": "יומן פעילות",
    "/admin/users": "משתמשים והרשאות",
    "/admin/mail-preview": "דוא״ל והתראות",
    "/admin/sheets": "גיליון מוצרים",
  };
  const title =
    titleMap[pathname] ||
    (pathname === "/admin/products/new" ? "מוצר חדש" : pathname.startsWith("/admin/products/") ? "עריכת מוצר" : pathname.startsWith("/admin/orders/") ? "פרטי הזמנה" : "ניהול");

  return (
    <AdminCtx.Provider value={{ user, mode, newOrders, refreshBadge, logout }}>
      <div className="admin-app" dir="rtl">
        {mode !== "git" && (
          <div className="persist-banner" style={{ borderRadius: 0, margin: 0 }}>
            {mode === "preview-demo" || mode === "local"
              ? "תצוגת הדגמה: שינויים נשמרים זמנית בשרת זה עד להפעלה מחדש. לשימור קבוע צריך אסימון GitHub."
              : "שינויים בקטלוג יישמרו בקובצי GitHub אחרי חיבור האסימון."}
          </div>
        )}
        <div className="app">
          <aside className={`sidebar ${menu ? "open" : ""}`}>
            <div className="brand">
              <img src="/brand/logo.jpg" alt="חזי אורקור" />
              <div>
                <div className="name">חזי אורקור</div>
                <div className="sub">ניהול האתר</div>
              </div>
            </div>
            <div className="nav-label">ניהול</div>
            {nav.map((n) => {
              const exact = "end" in n && Boolean(n.end);
              const active = exact ? isAdminHomePath(pathname) : pathname === n.to || pathname.startsWith(n.to + "/");
              return (
                <Link key={n.to} from="/" to={n.to} className={`nav-item${active ? " active" : ""}`} onClick={() => setMenu(false)}>
                  <span className="ico">{n.ico}</span>
                  {n.label}
                  {"badge" in n && n.badge && newOrders > 0 ? <span className="nav-count">{newOrders}</span> : null}
                </Link>
              );
            })}
            <div className="spacer" />
            <div className="user-card">
              <div className="avatar">{initial}</div>
              <div>
                <div className="who">{user.name}</div>
                <div className="role">{user.role === "master" ? "מאסטר · שליטה מלאה" : "עובד · מוצרים והזמנות"}</div>
              </div>
            </div>
            <button className="nav-item" type="button" onClick={() => void logout()}>
              <span className="ico">⎋</span>יציאה
            </button>
          </aside>
          <div className="main">
            <header className="topbar">
              <button className="icon-btn hamburger" type="button" aria-label="תפריט" onClick={() => setMenu((v) => !v)}>
                ☰
              </button>
              <h1>{title}</h1>
              <div className="grow" />
              <Link from="/" to="/admin/orders" className="icon-btn" aria-label="התראות">
                🔔{newOrders > 0 ? <span className="badge">{newOrders}</span> : null}
              </Link>
              <div className="avatar">{initial}</div>
            </header>
            <div className="content">
              <Outlet />
            </div>
          </div>
        </div>
        <nav className="bottom-nav">
          {nav
            .filter((n) => ["סקירה", "הזמנות", "מוצרים", "קטגוריות", "פעילות", "יומן פעילות"].includes(n.label) || (user.role === "worker" && n.label === "מוצרים"))
            .slice(0, 5)
            .map((n) => {
              const exact = "end" in n && Boolean(n.end);
              const active = exact ? isAdminHomePath(pathname) : pathname === n.to || pathname.startsWith(n.to + "/");
              const short = n.label === "יומן פעילות" ? "פעילות" : n.label;
              return (
                <Link key={n.to} from="/" to={n.to} className={active ? "active" : ""}>
                  <div className="ico">{n.ico}</div>
                  {short}
                </Link>
              );
            })}
        </nav>
        {menu ? <div className="sidebar-backdrop" onClick={() => setMenu(false)} /> : null}
      </div>
    </AdminCtx.Provider>
  );
}

