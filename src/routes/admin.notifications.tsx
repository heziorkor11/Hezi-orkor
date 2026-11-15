import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch, formatWhen, formatPrice } from "@/components/admin/api";
import type { StoredOrder } from "@/lib/admin/types";
import type { LowStockItem } from "@/lib/admin/stock-qty";

export const Route = createFileRoute("/admin/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "התראות · חזי אורקור" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function NotificationsPage() {
  const { refreshBadge, user } = useAdmin();
  const [data, setData] = useState<{
    newOrders: StoredOrder[];
    lowStock: LowStockItem[];
    counts: { newOrders: number; lowStock: number };
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void adminFetch<NonNullable<typeof data>>("/api/admin/notifications")
      .then((d) => {
        setData(d);
        refreshBadge();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, [refreshBadge]);

  if (error) return <p className="error-text">{error}</p>;
  if (!data) return <p>טוען…</p>;

  return (
    <div className="notify-page">
      <div className="section-title">התראות</div>
      <p className="muted" style={{ marginBottom: 16 }}>
        הזמנות חדשות (בלי הזמנות בדיקה) ומלאי שהגיע לסף או לאפס.
      </p>
      <div className="grid-2">
        <div className="card">
          <h2 className="section-title">הזמנות חדשות ({data.counts.newOrders})</h2>
          {data.newOrders.length === 0 ? <p className="muted">אין הזמנות חדשות.</p> : null}
          {data.newOrders.map((o) => (
            <Link key={o.id} from="/" to="/admin/orders/$id" params={{ id: o.id }} className="log-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sku">{o.id}</div>
                <div className="muted">
                  {o.customer.name} · {formatWhen(o.createdAt)} · {formatPrice(o.total)}
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="card">
          <h2 className="section-title">מלאי נמוך ({data.counts.lowStock})</h2>
          {data.lowStock.length === 0 ? <p className="muted">אין פריטים מתחת לסף.</p> : null}
          {data.lowStock.map((i) => (
            <Link key={i.sku} from="/" to="/admin/products/$sku" params={{ sku: i.sku }} className="log-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sku">{i.name}</div>
                <div className="muted">
                  {i.sku} · {i.out ? "אזל מהמלאי" : `${i.qty} יח׳`}
                </div>
              </div>
            </Link>
          ))}
          <p style={{ marginTop: 12 }}>
            <Link from="/" to="/admin/stock">לרשימה המלאה →</Link>
            {user.role === "master" ? (
              <>
                {" · "}
                <Link from="/" to="/admin/mail-preview">הגדרות דוא״ל</Link>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
