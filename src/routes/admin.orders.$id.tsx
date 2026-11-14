import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminFetch, formatPrice, formatWhen, STATUS_CLASS, STATUS_LABEL, DELIVERY_LABEL } from "@/components/admin/api";
import type { SafeUser, StoredOrder } from "@/lib/admin/types";
import { ORDER_STATUSES } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/orders/$id")({
  component: OrderDetailPage,
});

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

function OrderDetailPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function load() {
    const d = await adminFetch<{ order: StoredOrder; users?: SafeUser[] }>(`/api/admin/orders/${encodeURIComponent(id)}`);
    setOrder(d.order);
    setUsers(d.users || []);
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, [id]);

  async function patch(body: Record<string, unknown>) {
    setError("");
    setSaved("");
    const res = await adminFetch<{ order: StoredOrder }>(`/api/admin/orders/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    setOrder(res.order);
    setSaved("נשמר.");
  }

  function toggleLine(i: number, field: "picked" | "verified") {
    if (!order) return;
    const lines = order.lines.map((l, idx) => (idx === i ? { ...l, [field]: !l[field] } : l));
    void patch({ lines });
  }

  if (error && !order) return <p className="error-text">{error}</p>;
  if (!order) return <p>טוען…</p>;

  const picked = order.lines.filter((l) => l.picked).length;
  const verified = order.lines.filter((l) => l.verified).length;
  const lead = order.delivery === "delivery" ? "משלוח: 3–7 ימי עסקים" : "איסוף עצמי: 3–4 ימי עסקים";

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        <Link from="/" to="/admin/orders">← לכל ההזמנות</Link>
      </p>
      <div className="grid-2">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div>
              <div className="sku">{order.id}</div>
              <div className="when">{formatWhen(order.createdAt)}</div>
            </div>
            <span className={STATUS_CLASS[order.status]}>{STATUS_LABEL[order.status]}</span>
          </div>
          <h2 className="section-title" style={{ marginTop: 16 }}>לקוח</h2>
          <p>
            <b>{order.customer.name}</b>
            <br />
            טלפון: {order.customer.phone}
            {order.customer.plate ? <><br />מספר רכב: {order.customer.plate}</> : null}
            {order.customer.city ? <><br />עיר: {order.customer.city}</> : null}
            {(order.customer.make || order.customer.model || order.customer.year) ? (
              <><br />רכב: {[order.customer.make, order.customer.model, order.customer.year, order.customer.engine].filter(Boolean).join(" ")}</>
            ) : null}
            {order.customer.notes ? <><br />הערה: {order.customer.notes}</> : null}
          </p>
          <p>
            {DELIVERY_LABEL[order.delivery] || "לא צוין"} · {lead}
          </p>
          <h2 className="section-title">שורות · ליקוט ובדיקה</h2>
          <p className="muted">{picked}/{order.lines.length} לוקטו · {verified}/{order.lines.length} אומתו במחיר</p>
          <table className="data">
            <thead>
              <tr>
                <th>לוקט</th>
                <th>אומת</th>
                <th>מוצר</th>
                <th>כמות</th>
                <th>מחיר</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l, i) => (
                <tr key={l.sku}>
                  <td><input type="checkbox" checked={Boolean(l.picked)} onChange={() => toggleLine(i, "picked")} /></td>
                  <td><input type="checkbox" checked={Boolean(l.verified)} onChange={() => toggleLine(i, "verified")} /></td>
                  <td>
                    <div>{l.name}</div>
                    <div className="sku">{l.sku}</div>
                  </td>
                  <td>{l.qty}</td>
                  <td>{formatPrice(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            ביניים {formatPrice(order.subtotal)}
            {order.shipping ? ` · משלוח ${formatPrice(order.shipping)}` : " · ללא דמי משלוח"}
            <br />
            <b>סה״כ {formatPrice(order.total)}</b>
          </p>
        </div>
        <div className="card">
          <h2 className="section-title">תכנון ביצוע</h2>
          <div className="form-grid">
            <div className="field">
              <label>סטטוס</label>
              <select value={order.status} onChange={(e) => void patch({ status: e.target.value })}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>אחראי</label>
              <select value={order.assignedTo || ""} onChange={(e) => void patch({ assignedTo: e.target.value })}>
                <option value="">לא שויך</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>תאריך מתוכנן</label>
              <input type="date" value={order.scheduledDate || ""} onChange={(e) => void patch({ scheduledDate: e.target.value })} />
            </div>
            <div className="field span-2">
              <label>הערות פנימיות</label>
              <textarea value={order.internalNotes || ""} onChange={(e) => setOrder({ ...order, internalNotes: e.target.value })} onBlur={(e) => void patch({ internalNotes: e.target.value })} rows={4} />
            </div>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          {saved ? <p className="muted">{saved}</p> : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            <button className="btn btn-accent" type="button" onClick={() => void patch({ advance: true })}>
              קידום סטטוס
            </button>
            <a className="btn btn-ghost" href={waLink(order.customer.phone)} target="_blank" rel="noreferrer">
              וואטסאפ ללקוח
            </a>
          </div>
          <h2 className="section-title" style={{ marginTop: 24 }}>קובץ PDF</h2>
          {order.pdfStored ? (
            <p>
              <a className="btn btn-ghost" href={`/api/admin/orders/${encodeURIComponent(order.id)}/pdf`} target="_blank" rel="noreferrer">
                הורדת PDF
              </a>
            </p>
          ) : (
            <p className="muted">עדיין אין PDF שמור. אם הלקוח שלח מהעגלה, הקובץ אמור לעלות אוטומטית. אפשר גם להעלות כאן.</p>
          )}
          <label className="btn btn-sm btn-ghost" style={{ display: "inline-block", cursor: "pointer" }}>
            העלאת PDF
            <input
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setError("");
                void file.arrayBuffer().then(async (buf) => {
                  const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}/pdf`, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/pdf" },
                    body: buf,
                  });
                  const data = await res.json().catch(() => ({})) as { order?: typeof order; error?: string };
                  if (!res.ok) throw new Error(data.error || "העלאה נכשלה");
                  if (data.order) setOrder(data.order);
                  setSaved("ה-PDF נשמר במאגר הפרטי.");
                }).catch((err) => setError(err instanceof Error ? err.message : "העלאה נכשלה"));
              }}
            />
          </label>
          <h2 className="section-title" style={{ marginTop: 24 }}>היסטוריית סטטוס</h2>
          {order.events?.length ? (
            <ol style={{ margin: 0, paddingInlineStart: 18 }}>
              {order.events.map((ev, i) => (
                <li key={`${ev.at}-${i}`} style={{ marginBottom: 8 }}>
                  <div>{formatWhen(ev.at)} · {ev.byName}</div>
                  <div className="muted">
                    {ev.type === "created" ? "הזמנה נוצרה" : ev.type === "status" ? `סטטוס: ${STATUS_LABEL[ev.from as keyof typeof STATUS_LABEL] || ev.from || ""} → ${STATUS_LABEL[ev.to as keyof typeof STATUS_LABEL] || ev.to || ""}` : ev.type === "assign" ? `שיוך: ${ev.detail || ev.to || ""}` : ev.type === "schedule" ? `תאריך מתוכנן: ${ev.detail || ev.to || ""}` : ev.type === "pdf" ? "נשמר PDF" : ev.detail || ev.type}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">אין עדיין אירועים שמורים להזמנה הזו. שינויי סטטוס מכאן ייכתבו ליומן.</p>
          )}
        </div>
      </div>
    </>
  );
}
