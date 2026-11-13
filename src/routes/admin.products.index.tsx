import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { adminFetch, formatPrice } from "@/components/admin/api";
import type { AdminProductRow } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/products/")({
  component: ProductsPage,
});

type List = {
  items: AdminProductRow[];
  total: number;
  pages: number;
  page: number;
  noImage: number;
  noPrice: number;
  hidden: number;
};

function ProductsPage() {
  const [q, setQ] = useState("");
  const [image, setImage] = useState("all");
  const [price, setPrice] = useState("all");
  const [hidden, setHidden] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<List | null>(null);
  const [error, setError] = useState("");

  function load(next = page, qq = q) {
    const p = new URLSearchParams({ page: String(next), pageSize: "40", q: qq, image, price, hidden });
    setError("");
    void adminFetch<List>(`/api/admin/products?${p}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, image, price, hidden]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    load(1, q);
  }

  return (
    <>
      <form className="filters" onSubmit={onSearch} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם או מק״ט" style={{ flex: 1, minWidth: 180 }} />
        <select value={image} onChange={(e) => { setImage(e.target.value); setPage(1); }}>
          <option value="all">כל התמונות</option>
          <option value="yes">עם תמונה</option>
          <option value="no">בלי תמונה</option>
        </select>
        <select value={price} onChange={(e) => { setPrice(e.target.value); setPage(1); }}>
          <option value="all">כל המחירים</option>
          <option value="none">בלי מחיר מספרי</option>
        </select>
        <select value={hidden} onChange={(e) => { setHidden(e.target.value); setPage(1); }}>
          <option value="all">הכל, כולל מוסתרים</option>
          <option value="no">מוצגים באתר</option>
          <option value="yes">מוסתרים</option>
        </select>
        <button className="btn btn-accent" type="submit">חיפוש</button>
      </form>
      {error ? <p className="error-text">{error}</p> : null}
      {!data ? <p>טוען…</p> : (
        <>
          <p className="muted" style={{ marginBottom: 10 }}>
            {data.total.toLocaleString("he-IL")} תוצאות · בלי תמונה {data.noImage.toLocaleString("he-IL")} · בלי מחיר {data.noPrice.toLocaleString("he-IL")}
          </p>
          <div className="table-wrap card" style={{ padding: 0 }}>
            <table className="data">
              <thead>
                <tr>
                  <th></th>
                  <th>מוצר</th>
                  <th>קטגוריה</th>
                  <th>מחיר</th>
                  <th>תגים</th>
                  <th>הצגה</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.sku}>
                    <td>
                      {p.image ? <img className="thumb" src={p.image} alt="" /> : <div className="ph">אין תמונה</div>}
                    </td>
                    <td>
                      <Link to="/admin/products/$sku" params={{ sku: p.sku }} style={{ fontWeight: 700 }}>
                        {p.name}
                      </Link>
                      <div className="sku">{p.sku}</div>
                    </td>
                    <td>{p.categoryHe}</td>
                    <td className="price">{p.workshop ? "מחיר מיוחד למוסכים" : formatPrice(p.price)}</td>
                    <td>
                      {p.tags.map((t) => (
                        <span key={t.id} className="img-tag" style={{ position: "static", background: t.color, marginInlineEnd: 4 }}>
                          {t.label}
                        </span>
                      ))}
                    </td>
                    <td>{p.hidden ? <span className="chip">מוסתר</span> : <span className="chip new">מוצג</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
            <button className="btn btn-sm btn-ghost" type="button" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>הקודם</button>
            <span className="muted">עמוד {data.page} מתוך {data.pages}</span>
            <button className="btn btn-sm btn-ghost" type="button" disabled={page >= data.pages} onClick={() => setPage((n) => n + 1)}>הבא</button>
          </div>
        </>
      )}
    </>
  );
}
