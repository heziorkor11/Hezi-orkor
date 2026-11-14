import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch, formatPrice, formatWhen, STATUS_CLASS, STATUS_LABEL, DELIVERY_LABEL } from "@/components/admin/api";
import type { OrderStatus, StoredOrder } from "@/lib/admin/types";
import { ORDER_STATUSES } from "@/lib/admin/types";
import { isTestOrder } from "@/lib/admin/test-order";

export const Route = createFileRoute("/admin/orders/")({
  component: OrdersPage,
});

function OrdersPage() {
  const { refreshBadge } = useAdmin();
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [persist, setPersist] = useState<{ durable: boolean; reason: string } | null>(null);
  const [tab, setTab] = useState<"all" | OrderStatus>("all");
  const [showTest, setShowTest] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void adminFetch<{ orders: StoredOrder[]; counts: Record<string, number>; persist: { durable: boolean; reason: string } }>("/api/admin/orders")
      .then((d) => {
        setOrders(d.orders);
        setPersist(d.persist);
        refreshBadge();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, [refreshBadge]);

  const testCount = useMemo(() => orders.filter((o) => isTestOrder(o)).length, [orders]);
  const visible = useMemo(
    () => (showTest ? orders : orders.filter((o) => !isTestOrder(o))),
    [orders, showTest],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: visible.length };
    for (const o of visible) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [visible]);
  const list = useMemo(() => (tab === "all" ? visible : visible.filter((o) => o.status === tab)), [visible, tab]);

  return (
    <>
      {persist && !persist.durable ? (
        <div className="persist-banner">
          {persist.reason}. מוצע מאגר פרטי חינמי בשם heziorkor11/hezi-orkor-data — לא ניצור אותו בלי אישור מפורש.
        </div>
      ) : null}
      {testCount > 0 ? (
        <div className="test-orders-bar">
          <label className="test-orders-toggle">
            <input type="checkbox" checked={showTest} onChange={(e) => setShowTest(e.target.checked)} />
            <span>הצג הזמנות בדיקה</span>
          </label>
          <span className="muted">
            {showTest
              ? `${testCount} הזמנות בדיקה או דוגמה מוצגות ברשימה. הן לא נמחקות.`
              : `${testCount} הזמנות בדיקה או דוגמה מוסתרות כברירת מחדל.`}
          </span>
        </div>
      ) : null}
      <div className="status-tabs" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button type="button" className={`btn btn-sm ${tab === "all" ? "btn-accent" : "btn-ghost"}`} onClick={() => setTab("all")}>
          הכל ({counts.all ?? visible.length})
        </button>
        {ORDER_STATUSES.map((s) => (
          <button key={s.id} type="button" className={`btn btn-sm ${tab === s.id ? "btn-accent" : "btn-ghost"}`} onClick={() => setTab(s.id)}>
            {s.label} ({counts[s.id] ?? 0})
          </button>
        ))}
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {list.length === 0 ? (
        <p className="muted">
          {visible.length === 0 && testCount > 0 && !showTest
            ? "אין הזמנות רגילות להצגה. אפשר להציג הזמנות בדיקה בעזרת המתג למעלה."
            : "אין הזמנות בסטטוס הזה."}
        </p>
      ) : null}
      <div className="card" style={{ padding: 0 }}>
        {list.map((o) => (
          <Link from="/" key={o.id} to="/admin/orders/$id" params={{ id: o.id }} className="log-row order-log-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sku" dir="ltr">{o.id}</div>
              <div className="who">{o.customer.name}</div>
              <div className="muted">
                {DELIVERY_LABEL[o.delivery] || "—"}
                {o.customer.city ? ` · ${o.customer.city}` : ""}
              </div>
              <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span className={STATUS_CLASS[o.status]}>{STATUS_LABEL[o.status]}</span>
                {isTestOrder(o) ? <span className="chip order-test-chip">בדיקה</span> : null}
                <span className="price">{formatPrice(o.total)}</span>
              </div>
            </div>
            <div className="when">{formatWhen(o.createdAt)}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
