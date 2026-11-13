import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch } from "@/components/admin/api";

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesPage,
});

type Cat = { id: string; name: string; count?: number; hidden: boolean };

function CategoriesPage() {
  const { user } = useAdmin();
  const navigate = useNavigate();
  const [cats, setCats] = useState<Cat[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (user.role !== "master") {
      void navigate({ to: "/admin" });
      return;
    }
    void adminFetch<{ categories: Cat[] }>("/api/admin/categories")
      .then((d) => setCats(d.categories))
      .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, [user.role, navigate]);

  async function save(next: Cat[]) {
    setError("");
    setSaved("");
    try {
      const hidden = next.filter((c) => c.hidden).map((c) => c.id);
      const labels: Record<string, string> = {};
      for (const c of next) labels[c.id] = c.name;
      const res = await adminFetch<{ categories: Cat[] }>("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ hidden, labels, order: next.map((c) => c.id) }),
      });
      setCats(res.categories);
      setSaved("נשמר.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שמירה נכשלה");
    }
  }

  function move(i: number, dir: -1 | 1) {
    const next = [...cats];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[i];
    next[i] = next[j]!;
    next[j] = tmp!;
    setCats(next);
  }

  if (user.role !== "master") return null;

  return (
    <>
      <p className="muted" style={{ marginBottom: 12 }}>
        קטגוריות מוסתרות (פנס ראשי, מנועים קטנים) לא מופיעות בחנות. הסתרה עדיפה על מחיקה.
      </p>
      {error ? <p className="error-text">{error}</p> : null}
      {saved ? <p className="muted">{saved}</p> : null}
      <div className="table-wrap card" style={{ padding: 0 }}>
        <table className="data">
          <thead>
            <tr>
              <th>שם לתצוגה</th>
              <th>מוצרים</th>
              <th>הצגה</th>
              <th>סדר</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c, i) => (
              <tr key={c.id}>
                <td>
                  <input value={c.name} onChange={(e) => setCats((list) => list.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))} />
                  <div className="sku">{c.id}</div>
                </td>
                <td>{c.count ?? "—"}</td>
                <td>
                  <div className="toggle">
                    <button className={`switch${c.hidden ? " off" : " on"}`} type="button" onClick={() => setCats((list) => list.map((x) => (x.id === c.id ? { ...x, hidden: !x.hidden } : x)))} />
                    {c.hidden ? " מוסתרת" : " מוצגת"}
                  </div>
                </td>
                <td>
                  <button className="btn btn-sm btn-ghost" type="button" onClick={() => move(i, -1)}>למעלה</button>{" "}
                  <button className="btn btn-sm btn-ghost" type="button" onClick={() => move(i, 1)}>למטה</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="btn btn-accent" type="button" onClick={() => void save(cats)}>שמירת קטגוריות</button>
      </div>
    </>
  );
}
