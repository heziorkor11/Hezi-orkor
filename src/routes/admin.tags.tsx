import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch } from "@/components/admin/api";
import type { TagDef } from "@/lib/admin/types";
import { currentHomeDealsSkus } from "@/lib/home-deals";

export const Route = createFileRoute("/admin/tags")({
  component: TagsPage,
});

function TagsPage() {
  const { user } = useAdmin();
  const navigate = useNavigate();
  const [tags, setTags] = useState<TagDef[]>([]);
  const [deals, setDeals] = useState<string[]>([]);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#e23b12");
  const [id, setId] = useState("");
  const [dealSku, setDealSku] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (user.role !== "master") {
      void navigate({ to: "/admin" });
      return;
    }
    void adminFetch<{ tags: TagDef[]; deals: string[] }>("/api/admin/tags")
      .then((d) => {
        setTags(d.tags);
        setDeals(d.deals.length ? d.deals : [...currentHomeDealsSkus()]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, [user.role, navigate]);

  async function addTag() {
    setError("");
    try {
      const res = await adminFetch<{ tags: TagDef[]; deals: string[] }>("/api/admin/tags", {
        method: "POST",
        body: JSON.stringify({ add: { id: id || label, label, color } }),
      });
      setTags(res.tags || []);
      setLabel("");
      setId("");
      setSaved("התג נוסף לספרייה.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    }
  }

  async function saveDeals() {
    setError("");
    try {
      const res = await adminFetch<{ tags: TagDef[]; deals: string[] }>("/api/admin/tags", {
        method: "POST",
        body: JSON.stringify({ deals }),
      });
      setDeals(res.deals || deals);
      setSaved("מבצעי החודש נשמרו.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    }
  }

  if (user.role !== "master") return null;

  return (
    <div className="grid-2">
      <div className="card">
        <h2 className="section-title">ספריית תגים</h2>
        <p className="muted" style={{ marginTop: 0 }}>אפשר לבחור עד שני תגים למוצר. הם יושבים על התמונה: אחד בימין, שניים במראה.</p>
        <div className="tag-lib">
          {tags.map((t) => (
            <span key={t.id} className="lib-item">
              <span className="img-tag" style={{ position: "static", background: t.color }}>{t.label}</span>
            </span>
          ))}
        </div>
        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="field">
            <label>שם התג</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="למשל מלאי מוגבל" />
          </div>
          <div className="field">
            <label>מזהה (באנגלית)</label>
            <input value={id} onChange={(e) => setId(e.target.value)} placeholder="limited" dir="ltr" />
          </div>
          <div className="field">
            <label>צבע</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-accent" type="button" style={{ marginTop: 12 }} onClick={() => void addTag()} disabled={!label.trim()}>
          הוספת תג
        </button>
      </div>
      <div className="card">
        <h2 className="section-title">מבצעי החודש בדף הבית</h2>
        <p className="muted">עד 16 מק״טים בקרוסלת הבית. מומלץ לתייג אותם גם בתג «מבצע».</p>
        <ul style={{ padding: 0, listStyle: "none" }}>
          {deals.map((sku) => (
            <li key={sku} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <code className="sku">{sku}</code>
              <button className="btn btn-sm btn-ghost" type="button" onClick={() => setDeals((d) => d.filter((x) => x !== sku))}>הסרה</button>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={dealSku} onChange={(e) => setDealSku(e.target.value)} placeholder="מק״ט להוספה" dir="ltr" />
          <button className="btn btn-sm btn-ghost" type="button" onClick={() => { if (dealSku.trim()) { setDeals((d) => [...d, dealSku.trim()]); setDealSku(""); } }}>הוספה</button>
          <button className="btn btn-accent" type="button" onClick={() => void saveDeals()}>שמירת מבצעים</button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        {saved ? <p className="muted">{saved}</p> : null}
      </div>
    </div>
  );
}
