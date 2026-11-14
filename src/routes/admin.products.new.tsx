import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { adminFetch } from "@/components/admin/api";
import { useAdmin } from "@/components/admin/shell";
import type { AdminProductRow, TagDef } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/products/new")({
  component: NewProductPage,
});

type Cat = { id: string; name: string };
type Sub = { id: string; name: string };

function NewProductPage() {
  const { user } = useAdmin();
  const navigate = useNavigate();
  const isMaster = user?.role === "master";
  const [cats, setCats] = useState<Cat[]>([]);
  const [subs, setSubs] = useState<Record<string, Sub[]>>({});
  const [tags, setTags] = useState<TagDef[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("filters");
  const [subType, setSubType] = useState("");
  const [sku, setSku] = useState("");
  const [fitment, setFitment] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [imageData, setImageData] = useState<{ base64: string; mime: string } | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [c, t, tax] = await Promise.all([
        adminFetch<{ categories: Cat[] }>("/api/admin/categories"),
        adminFetch<{ tags: TagDef[] }>("/api/admin/tags"),
        fetch("/catalog/display-taxonomy.json").then((r) => r.json()).catch(() => ({ subcategories: {} })),
      ]);
      setCats((c.categories || []).filter((x) => x.id !== "lights" && x.id !== "small-engine"));
      setTags(t.tags || []);
      setSubs((tax.subcategories || {}) as Record<string, Sub[]>);
    })().catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, []);

  useEffect(() => {
    if (!category) return;
    const p = new URLSearchParams({ category, subType });
    void adminFetch<{ sku: string }>(`/api/admin/products/next-sku?${p}`)
      .then((d) => setSku(d.sku))
      .catch(() => {});
  }, [category, subType]);

  function toggleTag(id: string) {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 2) return [cur[1], id];
      return [...cur, id];
    });
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("התמונה גדולה מ-2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      const base64 = url.split(",")[1] || "";
      setImageData({ base64, mime: file.type || "image/jpeg" });
      setPreview(url);
    };
    reader.readAsDataURL(file);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await adminFetch<{ product: AdminProductRow }>(" /api/admin/products".trim(), {
        method: "POST",
        body: JSON.stringify({
          name,
          category,
          subType: subType || undefined,
          fitment: fitment || undefined,
          make: make || undefined,
          model: model || undefined,
          yearFrom: yearFrom ? Number(yearFrom) : undefined,
          yearTo: yearTo ? Number(yearTo) : undefined,
          price: isMaster && price.trim() ? Number(price) : null,
          tags: selected,
          stock: stock || undefined,
        }),
      });
      const newSku = created.product.sku;
      if (imageData) {
        await adminFetch(`/api/admin/products/${encodeURIComponent(newSku)}/image`, {
          method: "POST",
          body: JSON.stringify({ imageBase64: imageData.base64, mimeType: imageData.mime }),
        });
      }
      await navigate({ to: "/admin/products/$sku", params: { sku: newSku } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  const subOptions = subs[category] || [];

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        <Link from="/" to="/admin/products">← לכל המוצרים</Link>
      </p>
      <form className="grid-2" onSubmit={(e) => void onSave(e)}>
        <div className="card">
          <h2 className="section-title">מוצר חדש</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            המק״ט נוצר אוטומטית לפי קידומת הקטגוריה (המספר הפנוי הבא). המוצר מופיע בחנות ובחיפוש מיד.
            {!isMaster ? " מחיר למאסטר בלבד — המוצר יישמר כהצעת מחיר." : null}
          </p>
          <div className="form-grid">
            <div className="field span-2">
              <label>שם לתצוגה באתר</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="למשל פילטר מזגן ל…" />
            </div>
            <div className="field">
              <label>קטגוריה</label>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setSubType(""); }}>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>תת-סוג</label>
              {subOptions.length ? (
                <select value={subType} onChange={(e) => setSubType(e.target.value)}>
                  <option value="">ללא</option>
                  {subOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <input value={subType} onChange={(e) => setSubType(e.target.value)} placeholder="אופציונלי" />
              )}
            </div>
            <div className="field">
              <label>מק״ט (יוקצה אוטומטית)</label>
              <input value={sku} readOnly style={{ direction: "ltr", textAlign: "right", color: "var(--muted)" }} />
            </div>
            <div className="field">
              <label>מלאי</label>
              <input value={stock} onChange={(e) => setStock(e.target.value)} placeholder="לא חובה. למשל 12 יח׳" />
            </div>
            {isMaster ? (
              <div className="field">
                <label>מחיר ללקוח (₪, כולל מע״מ)</label>
                <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="ריק = הצעת מחיר" />
              </div>
            ) : (
              <div className="field">
                <label>מחיר ללקוח</label>
                <input value="" readOnly placeholder="המאסטר ישלים מחיר מאוחר יותר" />
              </div>
            )}
            <div className="field span-2">
              <label>התאמת רכב</label>
              <input value={fitment} onChange={(e) => setFitment(e.target.value)} placeholder="למשל טויוטה קורולה 2016–2020" />
            </div>
            <div className="field">
              <label>יצרן</label>
              <input value={make} onChange={(e) => setMake(e.target.value)} />
            </div>
            <div className="field">
              <label>דגם</label>
              <input value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
            <div className="field">
              <label>משנה</label>
              <input inputMode="numeric" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} />
            </div>
            <div className="field">
              <label>עד שנה</label>
              <input inputMode="numeric" value={yearTo} onChange={(e) => setYearTo(e.target.value)} />
            </div>
            <div className="field span-2">
              <label>תגים על גבי התמונה (עד שניים)</label>
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
                {preview ? <img className="thumb" src={preview} alt="" /> : <div className="ph">אין תמונה</div>}
                <div>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onFile(e.target.files?.[0])} />
                  <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>JPEG, PNG או WebP עד 2MB. מומלץ 1200×1200, רקע לבן.</div>
                </div>
              </div>
            </div>
          </div>
          {error ? <div className="error-text">{error}</div> : null}
          <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
            <button className="btn btn-accent" type="submit" disabled={busy || !name.trim()}>{busy ? "שומר…" : "יצירת מוצר"}</button>
            <Link from="/" className="btn btn-ghost" to="/admin/products">ביטול</Link>
          </div>
        </div>
      </form>
    </>
  );
}
