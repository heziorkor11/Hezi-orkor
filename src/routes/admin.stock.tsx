import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch } from "@/components/admin/api";
import type { LowStockItem } from "@/lib/admin/stock-qty";

export const Route = createFileRoute("/admin/stock")({
  component: LowStockPage,
  head: () => ({
    meta: [
      { title: "מלאי נמוך · חזי אורקור" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function LowStockPage() {
  const { refreshBadge } = useAdmin();
  const [items, setItems] = useState<LowStockItem[] | null>(null);
  const [threshold, setThreshold] = useState(3);
  const [error, setError] = useState("");

  useEffect(() => {
    void adminFetch<{ items: LowStockItem[]; threshold: number }>("/api/admin/stock/low")
      .then((d) => {
        setItems(d.items);
        setThreshold(d.threshold);
        refreshBadge();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, [refreshBadge]);

  if (error) return <p className="error-text">{error}</p>;
  if (!items) return <p>טוען…</p>;

  return (
    <div>
      <div className="section-title">מלאי נמוך</div>
      <p className="muted" style={{ marginBottom: 16 }}>
        מוצרים עם כמות מנוהלת עד {threshold} יח׳ (כולל 0). המלאי משתנה רק ידנית, והסף נקבע בהגדרות הדוא״ל.
      </p>
      {items.length === 0 ? <p className="muted">אין פריטים מתחת לסף כרגע.</p> : null}
      <div className="card" style={{ padding: 0 }}>
        {items.map((i) => (
          <Link key={i.sku} from="/" to="/admin/products/$sku" params={{ sku: i.sku }} className="log-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sku">{i.name}</div>
              <div className="muted" dir="ltr" style={{ textAlign: "right" }}>{i.sku}</div>
            </div>
            <span className={i.out ? "stock-pill out" : "stock-pill low"}>{i.out ? "אזל מהמלאי" : `${i.qty} יח׳`}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
