import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch, formatPrice } from "@/components/admin/api";
import type { OrderSummary } from "@/lib/admin/summary";

export const Route = createFileRoute("/admin/summary")({
  component: SummaryPage,
  head: () => ({
    meta: [
      { title: "סיכום יומי ושבועי · חזי אורקור" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type Payload = { daily: OrderSummary; weekToDate: OrderSummary; lastWeek: OrderSummary };

function Block({ title, data }: { title: string; data: OrderSummary }) {
  return (
    <div className="card">
      <h2 className="section-title">{title}</h2>
      <p className="muted" style={{ marginBottom: 12 }}>{data.labelHe} · שעון ישראל · בלי הזמנות בדיקה</p>
      <div className="grid-4" style={{ marginBottom: 12 }}>
        <div className="stat">
          <div className="k">הזמנות</div>
          <div className="v">{data.orderCount}</div>
        </div>
        <div className="stat">
          <div className="k">פריטים</div>
          <div className="v">{data.itemCount}</div>
        </div>
        <div className="stat">
          <div className="k">מחזור</div>
          <div className="v">{formatPrice(data.revenue)}</div>
        </div>
      </div>
      <h3 style={{ fontSize: 14, margin: "8px 0" }}>מובילים</h3>
      {data.topProducts.length === 0 ? <p className="muted">אין הזמנות בטווח.</p> : null}
      <ol className="summary-top">
        {data.topProducts.map((p) => (
          <li key={p.sku}>
            <span>{p.name}</span>
            <span className="muted">{p.qty} יח׳ · {p.sku}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SummaryPage() {
  const { user } = useAdmin();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"daily" | "weekly" | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    void adminFetch<Payload>("/api/admin/summary")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, []);

  async function send(kind: "daily" | "weekly") {
    setBusy(kind);
    setStatus("");
    try {
      const res = await adminFetch<{ ok: boolean; reason?: string; recipients: number }>(
        "/api/admin/summary/send",
        { method: "POST", body: JSON.stringify({ kind }) },
      );
      setStatus(res.ok ? `נשלח ל־${res.recipients} נמענים.` : `לא נשלח: ${res.reason || "שגיאה"}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "שליחה נכשלה");
    } finally {
      setBusy(null);
    }
  }

  if (error) return <p className="error-text">{error}</p>;
  if (!data) return <p>טוען…</p>;

  return (
    <div>
      <div className="section-title">סיכום יומי ושבועי</div>
      <p className="muted" style={{ marginBottom: 16 }}>
        הנתונים מחושבים מהזמנות אמיתיות בלבד, לפי שעון ישראל. מייל יומי נשלח בערב ומייל שבועי ביום ראשון בבוקר (שעון UTC, דיוק של עד 59 דקות).
      </p>
      {user.role === "master" ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <button className="btn btn-accent" type="button" disabled={!!busy} onClick={() => void send("daily")}>
            {busy === "daily" ? "שולח…" : "שלח סיכום יומי עכשיו"}
          </button>
          <button className="btn" type="button" disabled={!!busy} onClick={() => void send("weekly")}>
            {busy === "weekly" ? "שולח…" : "שלח סיכום שבועי עכשיו"}
          </button>
        </div>
      ) : null}
      {status ? <p className="muted" role="status" style={{ marginBottom: 16 }}>{status}</p> : null}
      <div style={{ display: "grid", gap: 16 }}>
        <Block title="היום" data={data.daily} />
        <Block title="השבוע (ראשון עד היום)" data={data.weekToDate} />
        <Block title="השבוע שעבר (ראשון עד שבת)" data={data.lastWeek} />
      </div>
    </div>
  );
}
