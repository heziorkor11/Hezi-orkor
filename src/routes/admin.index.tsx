import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch, formatPrice, formatWhen, STATUS_CLASS, STATUS_LABEL, DELIVERY_LABEL } from "@/components/admin/api";
import type { ActivityEntry, StoredOrder } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/")({
  component: HomePage,
});

function HomePage() {
  const { user, refreshBadge } = useAdmin();
  const [data, setData] = useState<{
    stats: { catalogSize: number; visible: number; noImage: number; noPrice: number };
    activity: ActivityEntry[];
    orders: StoredOrder[];
    newOrders: number;
    persist: { durable: boolean; reason: string };
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void adminFetch<NonNullable<typeof data>>("/api/admin/home")
      .then((d) => {
        setData(d);
        refreshBadge();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, [refreshBadge]);

  async function revert(id: string) {
    if (!confirm("לבטל את השינוי ולהחזיר את המצב הקודם?")) return;
    await adminFetch(`/api/admin/activity/${id}/revert`, { method: "POST", body: "{}" });
    const d = await adminFetch<NonNullable<typeof data>>("/api/admin/home");
    setData(d);
  }

  if (error) return <p className="error-text">{error}</p>;
  if (!data) return <p>טוען…</p>;

  return (
    <>
      {!data.persist.durable ? <div className="persist-banner">{data.persist.reason}. מוצע מאגר פרטי חינמי: heziorkor11/hezi-orkor-data — לא ניצור אותו בלי אישור.</div> : null}
      <div className="grid-4">
        <div className="card stat">
          <div className="k">מוצרים בקטלוג</div>
          <div className="v">{data.stats.catalogSize.toLocaleString("he-IL")}</div>
          <div className="hint">{data.stats.visible.toLocaleString("he-IL")} מוצגים באתר</div>
        </div>
        <div className="card stat warn">
          <div className="k">בלי תמונה</div>
          <div className="v">{data.stats.noImage.toLocaleString("he-IL")}</div>
          <div className="hint">מוצרים שעדיין בלי צילום</div>
        </div>
        <div className="card stat warn">
          <div className="k">בלי מחיר</div>
          <div className="v">{data.stats.noPrice.toLocaleString("he-IL")}</div>
          <div className="hint">כולל מארזי מוסך והצעת מחיר</div>
        </div>
        <div className="card stat warn">
          <div className="k">הזמנות חדשות</div>
          <div className="v">{data.newOrders}</div>
          <div className="hint">ממתינות לקבלה ובדיקה</div>
        </div>
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 className="section-title">הזמנות נכנסות</h2>
          {data.orders.length === 0 ? <p className="muted">אין הזמנות עדיין. הזמנה שנשלחת בוואטסאפ מהעגלה תגיע לכאן.</p> : null}
          {data.orders.map((o) => (
            <Link key={o.id} to="/admin/orders/$id" params={{ id: o.id }} className="log-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sku">{o.id}</div>
                <div>
                  <span className="who">{o.customer.name}</span> · {DELIVERY_LABEL[o.delivery] || "—"}
                </div>
                <div style={{ marginTop: 4 }}>
                  <span className={STATUS_CLASS[o.status]}>{STATUS_LABEL[o.status]}</span>{" "}
                  <span className="price">{formatPrice(o.total)}</span>
                </div>
              </div>
              <div className="when">{formatWhen(o.createdAt)}</div>
            </Link>
          ))}
          <div style={{ marginTop: 12 }}>
            <Link className="btn btn-sm btn-accent" to="/admin/orders">
              לכל ההזמנות
            </Link>
          </div>
        </div>
        <div className="card">
          <h2 className="section-title">שינויי עובדים שעלו היום</h2>
          <p className="muted" style={{ margin: "0 0 8px", fontSize: 12 }}>
            עולים לאתר מיד. אפשר לבטל בלחיצה — גם מהדוא״ל.
          </p>
          {data.activity.length === 0 ? <p className="muted">אין שינויים עדיין.</p> : null}
          {data.activity.map((e) => (
            <div key={e.id} className="log-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>
                  <span className="who">{e.actorName}</span> · {e.action}{" "}
                  {e.reverted ? <span className="chip">בוטל</span> : <span className="chip new">עלה לאתר</span>}
                </div>
                <div className="sku">{e.target}</div>
                <div className="diff">
                  <span className="from">{JSON.stringify(e.before)}</span> → <span className="to">{JSON.stringify(e.after)}</span>
                </div>
              </div>
              <div style={{ textAlign: "left" }}>
                <div className="when">{formatWhen(e.at)}</div>
                {user.role === "master" && !e.reverted ? (
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-sm btn-danger" type="button" onClick={() => void revert(e.id)}>
                      בטל
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <Link className="btn btn-sm btn-ghost" to="/admin/activity">
              לכל יומן הפעילות
            </Link>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="section-title">פעולות מהירות</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn btn-accent" to="/admin/orders">
            הזמנות נכנסות
          </Link>
          <Link className="btn btn-ghost" to="/admin/products">
            ניהול מוצרים
          </Link>
          {user.role === "master" ? (
            <>
              <Link className="btn btn-ghost" to="/admin/tags">
                תגים ומבצעי החודש
              </Link>
              <Link className="btn btn-ghost" to="/admin/users">
                הוספת עובד
              </Link>
            </>
          ) : null}
        </div>
        <p className="muted" style={{ margin: "16px 0 0", fontSize: 13 }}>
          שינויים נשמרים בהיסטוריית GitHub ועולים לאתר תוך כ־2–5 דקות. שינוי של עובד חי מיד; התראה עם כפתור «בטל» מגיעה לדוא״ל של המאסטר.
        </p>
      </div>
    </>
  );
}
