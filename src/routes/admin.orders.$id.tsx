import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminFetch, formatPrice, formatWhen, STATUS_CLASS, STATUS_LABEL, DELIVERY_LABEL } from "@/components/admin/api";
import type { SafeUser, StoredOrder, OrderEvent } from "@/lib/admin/types";
import { ORDER_STATUSES } from "@/lib/admin/types";
import { isTestOrder } from "@/lib/admin/test-order";

export const Route = createFileRoute("/admin/orders/$id")({
  component: OrderDetailPage,
});

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

function telLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:${digits}` : "";
}

function eventLabel(ev: OrderEvent) {
  if (ev.type === "created") return "הזמנה נוצרה";
  if (ev.type === "status") {
    return `סטטוס: ${STATUS_LABEL[ev.from as keyof typeof STATUS_LABEL] || ev.from || ""} → ${STATUS_LABEL[ev.to as keyof typeof STATUS_LABEL] || ev.to || ""}`;
  }
  if (ev.type === "assign") return `שיוך: ${ev.detail || ev.to || ""}`;
  if (ev.type === "schedule") return `תאריך מתוכנן: ${ev.detail || ev.to || ""}`;
  if (ev.type === "pdf") return "נשמר PDF";
  return ev.detail || ev.type;
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
  const test = isTestOrder(order);
  const phoneHref = telLink(order.customer.phone);
  const vehicle = [order.customer.make, order.customer.model, order.customer.year, order.customer.engine].filter(Boolean).join(" ");

  return (
    <div className="order-page">
      <p className="muted order-back">
        <Link from="/" to="/admin/orders">← לכל ההזמנות</Link>
      </p>
      {test ? (
        <div className="order-test-banner" role="status">
          הזמנת בדיקה או דוגמה. היא מוסתרת מרשימת ההזמנות כברירת מחדל ולא נמחקה.
        </div>
      ) : null}

      <div className="order-page-main">
      <section className="card order-summary-card">
        <div className="order-summary-top">
          <div>
            <div className="order-id">{order.id}</div>
            <div className="when">{formatWhen(order.createdAt)}</div>
          </div>
          <div className="order-summary-badges">
            <span className={STATUS_CLASS[order.status]}>{STATUS_LABEL[order.status]}</span>
            {test ? <span className="chip order-test-chip">הזמנת בדיקה</span> : null}
          </div>
        </div>
        <div className="order-summary-total">
          <span className="k">סה״כ לתשלום</span>
          <span className="v">{formatPrice(order.total)}</span>
        </div>
      </section>

      <section className="card order-customer-card">
        <h2 className="section-title">לקוח</h2>
        <p className="order-customer-name">{order.customer.name}</p>
        <div className="order-customer-actions">
          {phoneHref ? (
            <a className="btn btn-ghost order-contact" href={phoneHref}>התקשר</a>
          ) : (
            <span className="muted">אין טלפון</span>
          )}
          {order.customer.phone ? (
            <a className="btn btn-wa order-contact" href={waLink(order.customer.phone)} target="_blank" rel="noreferrer">
              וואטסאפ
            </a>
          ) : null}
        </div>
        <dl className="order-facts">
          {order.customer.phone ? (
            <>
              <dt>טלפון</dt>
              <dd dir="ltr">{order.customer.phone}</dd>
            </>
          ) : null}
          {order.customer.city ? (
            <>
              <dt>עיר</dt>
              <dd>{order.customer.city}</dd>
            </>
          ) : null}
          <dt>אופן אספקה</dt>
          <dd>
            {DELIVERY_LABEL[order.delivery] || "לא צוין"}
            <span className="muted"> · {lead}</span>
          </dd>
          {order.customer.plate ? (
            <>
              <dt>מספר רכב</dt>
              <dd dir="ltr">{order.customer.plate}</dd>
            </>
          ) : null}
          {vehicle ? (
            <>
              <dt>רכב</dt>
              <dd>{vehicle}</dd>
            </>
          ) : null}
          {order.customer.notes ? (
            <>
              <dt>הערה מהלקוח</dt>
              <dd>{order.customer.notes}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <section className="card order-items-card">
        <h2 className="section-title">פריטים · ליקוט ובדיקת מחיר</h2>
        <p className="order-progress">
          <span>{picked} מתוך {order.lines.length} לוקטו</span>
          <span>{verified} מתוך {order.lines.length} נבדק מחיר</span>
        </p>
        <div className="order-line-list">
          {order.lines.map((l, i) => (
            <article key={`${l.sku}-${i}`} className="order-line-card">
              <div className="order-line-name">{l.name}</div>
              <div className="sku">{l.sku}</div>
              <div className="order-line-math" dir="ltr">
                <span>{l.qty} × {formatPrice(l.unitPrice)}</span>
                <span className="order-line-eq">=</span>
                <strong>{formatPrice(l.lineTotal)}</strong>
              </div>
              <div className="order-line-toggles">
                <label className={`pick-toggle${l.picked ? " on" : ""}`}>
                  <input type="checkbox" checked={Boolean(l.picked)} onChange={() => toggleLine(i, "picked")} />
                  <span>לוקט</span>
                </label>
                <label className={`pick-toggle${l.verified ? " on" : ""}`}>
                  <input type="checkbox" checked={Boolean(l.verified)} onChange={() => toggleLine(i, "verified")} />
                  <span>נבדק מחיר</span>
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card order-totals-card">
        <h2 className="section-title">סיכום תשלום</h2>
        <div className="order-totals">
          <div><span>ביניים</span><span>{formatPrice(order.subtotal)}</span></div>
          <div>
            <span>משלוח</span>
            <span>{order.shipping ? formatPrice(order.shipping) : "ללא דמי משלוח"}</span>
          </div>
          <div className="grand"><span>סה״כ</span><span>{formatPrice(order.total)}</span></div>
        </div>
      </section>
      </div>

      <div className="order-page-side">
      <section className="card order-plan-card">
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
        <div className="order-plan-actions">
          <button className="btn btn-accent" type="button" onClick={() => void patch({ advance: true })}>
            קידום סטטוס
          </button>
          <a className="btn btn-wa" href={waLink(order.customer.phone)} target="_blank" rel="noreferrer">
            וואטסאפ ללקוח
          </a>
        </div>
      </section>

      <section className="card order-timeline-card">
        <h2 className="section-title">היסטוריית סטטוס</h2>
        {order.events?.length ? (
          <ol className="order-timeline">
            {order.events.map((ev, i) => (
              <li key={`${ev.at}-${i}`}>
                <div>{formatWhen(ev.at)} · {ev.byName}</div>
                <div className="muted">{eventLabel(ev)}</div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">אין עדיין אירועים שמורים להזמנה הזו. שינויי סטטוס מכאן ייכתבו ליומן.</p>
        )}
      </section>

      <section className="card order-pdf-card">
        <h2 className="section-title">קובץ PDF</h2>
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
      </section>
      </div>
    </div>
  );
}
