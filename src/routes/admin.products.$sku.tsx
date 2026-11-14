import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { adminFetch, formatPrice } from "@/components/admin/api";
import { useAdmin } from "@/components/admin/shell";
import type { AdminProductRow } from "@/lib/admin/types";
import type { TagDef } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/products/$sku")({
  component: ProductEditPage,
});

function ProductEditPage() {
  const { sku } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAdmin();
  const canEditPrice = user?.role === "master";
  const [row, setRow] = useState<AdminProductRow | null>(null);
  const [tags, setTags] = useState<TagDef[]>([]);
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [hidden, setHidden] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");
  const [stock, setStock] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [p, c, t] = await Promise.all([
          adminFetch<{ product: AdminProductRow }>(`/api/admin/products/${encodeURIComponent(sku)}`),
          adminFetch<{ categories: { id: string; name: string }[] }>("/api/admin/categories"),
          adminFetch<{ tags: TagDef[] }>("/api/admin/tags"),
        ]);
        setRow(p.product);
        setName(p.product.name);
        setPrice(p.product.price != null ? String(p.product.price) : "");
        setCategory(p.product.category);
        setHidden(p.product.hidden);
        setSelected(p.product.tags.map((x) => x.id));
        setStock(p.product.stock || "");
        setCats(c.categories);
        setTags(t.tags);
      } catch (e) {
        setError(e instanceof Error ? e.message : "שגיאה");
      }
    })();
  }, [sku]);

  function toggleTag(id: string) {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 2) return [cur[1], id];
      return [...cur, id];
    });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const body: Record<string, unknown> = { name, category, hidden, tags: selected, stock };
      if (canEditPrice && !row?.workshop) {
        body.price = price.trim() === "" ? null : Number(price);
      }
      const res = await adminFetch<{ product: AdminProductRow }>(`/api/admin/products/${encodeURIComponent(sku)}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setRow(res.product);
      setSaved("נשמר. השינוי יוצג בחנות מיד בתצוגה זו, ובאתר החי תוך כ־2–5 דקות אחרי שמירה ל-GitHub.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  if (error && !row) return <p className="error-text">{error}</p>;
  if (!row) return <p>טוען…</p>;

  const chosen = selected
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is TagDef => Boolean(t));

  return (
    <form className="grid-2" onSubmit={(e) => void onSave(e)}>
      <div className="card">
        <div className="form-grid">
          <div className="field span-2">
            <label>שם לתצוגה באתר</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>מק״ט</label>
            <input value={row.sku} readOnly style={{ direction: "ltr", textAlign: "right", color: "var(--muted)" }} />
          </div>
          <div className="field">
            <label>מחיר ללקוח (₪, כולל מע״מ)</label>
            {row.workshop ? (
              <>
                <input value="" readOnly placeholder="אין מחיר מספרי" />
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>למארזי מוסך מוצג «מחיר מיוחד למוסכים וספקים» בלבד.</div>
              </>
            ) : (
              <>
                <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="ריק = הצעת מחיר" disabled={!canEditPrice} />
                {!canEditPrice ? <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>שינוי מחיר למאסטר בלבד.</div> : null}
              </>
            )}
          </div>
          <div className="field">
            <label>קטגוריה</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>מלאי</label>
            <input value={stock} onChange={(e) => setStock(e.target.value)} placeholder="לא חובה. למשל 12 יח׳" />
          </div>
          <div className="field span-2">
            <label>תגים על גבי התמונה</label>
            <p className="muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
              בחרו עד שני תגים. תג אחד יושב בפינה הימנית העליונה של התמונה; שני תגים — במראה, ימין ושמאל.
            </p>
            <div className="tag-lib">
              {tags.map((t) => (
                <button key={t.id} type="button" className={`lib-item${selected.includes(t.id) ? " on" : ""}`} onClick={() => toggleTag(t.id)}>
                  <span className="img-tag" style={{ position: "static", boxShadow: "none", background: t.color }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="field span-2">
            <label>תמונת מוצר</label>
            <div className="upload">
              {row.image ? <img className="thumb" src={row.image} alt="" /> : <div className="ph">אין תמונה</div>}
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{row.image ? "תמונה נוכחית" : "אין תמונה בקטלוג"}</div>
                <label className="btn btn-sm btn-ghost" style={{ display: "inline-block", cursor: uploading ? "wait" : "pointer" }}>
                  {uploading ? "מעלה…" : "החלפת תמונה"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        setError("התמונה גדולה מ-2MB");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const url = String(reader.result || "");
                        const base64 = url.split(",")[1] || "";
                        setUploading(true);
                        setError("");
                        void adminFetch<{ product: AdminProductRow }>(`/api/admin/products/${encodeURIComponent(sku)}/image`, {
                          method: "POST",
                          body: JSON.stringify({ imageBase64: base64, mimeType: file.type || "image/jpeg" }),
                        })
                          .then((res) => {
                            setRow(res.product);
                            setSaved("התמונה נשמרה ומוצגת בחנות דרך שכבת התצוגה החיה.");
                          })
                          .catch((err) => setError(err instanceof Error ? err.message : "העלאה נכשלה"))
                          .finally(() => setUploading(false));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                  JPEG, PNG או WebP עד 2MB. מומלץ 1200×1200, רקע לבן. לוגו המותג שעל האריזה מותר. שינוי של עובד נרשם ונשלח למאסטר עם קישור «בטל».
                </div>
              </div>
            </div>
          </div>
          <div className="field span-2">
            <label>הצגה באתר</label>
            <div className="toggle">
              <button className={`switch${hidden ? " off" : " on"}`} type="button" aria-label={hidden ? "מוסתר" : "מוצג"} onClick={() => setHidden((v) => !v)} />
              {hidden ? " המוצר מוסתר מהחנות" : " המוצר מוצג בחנות"}
            </div>
          </div>
        </div>
        {error ? <div className="error-text">{error}</div> : null}
        {saved ? <p className="muted">{saved}</p> : null}
        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <button className="btn btn-accent" type="submit" disabled={busy}>{busy ? "שומר…" : "שמירה"}</button>
          <Link from="/" className="btn btn-ghost" to="/admin/products">ביטול</Link>
        </div>
      </div>
      <div>
        <h2 className="section-title">תצוגה חיה בכרטיס המוצר</h2>
        <p className="muted" style={{ margin: "0 0 12px", fontSize: 13 }}>
          כך התג יושב על התמונה באתר.
        </p>
        <article className="store-card preview">
          <div className="store-photo">
            {row.image ? <img src={row.image} alt="" /> : <div className="ph">אין תמונה</div>}
            {chosen[0] ? (
              <span className="img-tag tr" style={{ background: chosen[0].color }}>{chosen[0].label}</span>
            ) : null}
            {chosen[1] ? (
              <span className="img-tag tl" style={{ background: chosen[1].color }}>{chosen[1].label}</span>
            ) : null}
          </div>
          <div className="store-body">
            <div className="store-sku">מק״ט {row.sku}</div>
            <div className="store-name">{name}</div>
            <div className="store-price">{row.workshop ? "מחיר מיוחד למוסכים וספקים" : price.trim() ? formatPrice(Number(price)) : "הצעת מחיר"}</div>
          </div>
        </article>
        <button className="btn btn-sm btn-ghost" type="button" style={{ marginTop: 12 }} onClick={() => void navigate({ to: "/product/$id", params: { id: sku } })}>
          פתיחה בחנות
        </button>
      </div>
    </form>
  );
}
