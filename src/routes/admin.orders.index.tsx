import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch, formatPrice, formatWhen, STATUS_CLASS, STATUS_LABEL, DELIVERY_LABEL } from "@/components/admin/api";
import type { OrderStatus, StoredOrder } from "@/lib/admin/types";
import { ORDER_STATUSES } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/orders/")({
  component: OrdersPage,
});

function OrdersPage() {
  const { refreshBadge } = useAdmin();
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [persist, setPersist] = useState<{ durable: boolean; reason: string } | null>(null);
  const [tab, setTab] = useState<"all" | OrderStatus>("all");
  const [error, setError] = useState("");

  useEffect(() => {
    void adminFetch<{ orders: StoredOrder[]; counts: Record<string, number>; persist: { durable: boolean; reason: string } }>("/api/admin/orders")
      .then((d) => {
        setOrders(d.orders);
        setCounts(d.counts);
        setPersist(d.persist);
        refreshBadge();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, [refreshBadge]);

  const list = useMemo(() => (tab === "all" ? orders : orders.filter((o) => o.status === tab)), [orders, tab]);

  return (
    <>
      {persist && !persist.durable ? (
        <div className="persist-banner">
          {persist.reason}. מוצע מאגר פרטי חינמי בשם heziorkor11/hezi-orkor-data — לא ניצור אותו בלי אישור מפורש.
        </div>
      ) : null}
      <div className="status-tabs" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button type="button" className={`btn btn-sm ${tab === "all" ? "btn-accent" : "btn-ghost"}`} onClick={() => setTab("all")}>
          הכל ({counts.all ?? orders.length})
        </button>
        {ORDER_STATUSES.map((s) => (
          <button key={s.id} type="button" className={`btn btn-sm ${tab === s.id ? "btn-accent" : "btn-ghost"}`} onClick={() => setTab(s.id)}>
            {s.label} ({counts[s.id] ?? 0})
          </button>
        ))}
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {list.length === 0 ? <p className="muted">אין הזמנות בסטטוס הזה.</p> : null}
      <div className="card" style={{ padding: 0 }}>
        {list.map((o) => (
          <Link from="/" key={o.id} to="/admin/orders/$id" params={{ id: o.id }} className="log-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sku">{o.id}</div>
              <div>
                <span className="who">{o.customer.name}</span> · {DELIVERY_LABEL[o.delivery] || "—"}
                {o.customer.city ? ` · ${o.customer.city}` : ""}
              </div>
              <div style={{ marginTop: 4 }}>
                <span className={STATUS_CLASS[o.status]}>{STATUS_LABEL[o.status]}</span>{" "}
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
