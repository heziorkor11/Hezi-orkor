import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch } from "@/components/admin/api";
import { ADMIN_HOME } from "@/lib/admin/paths";

export const Route = createFileRoute("/admin/sheets")({
  component: SheetsPage,
});

function SheetsPage() {
  const { user } = useAdmin();
  const navigate = useNavigate();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user.role !== "master") {
      void navigate({ from: "/", to: ADMIN_HOME });
      return;
    }
    void adminFetch<{ configured: boolean }>("/api/admin/sheets/status")
      .then((d) => setConfigured(d.configured))
      .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, [user.role, navigate]);

  if (user.role !== "master") return null;

  async function resync() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await adminFetch<{ ok: boolean; rows?: number; error?: string }>("/api/admin/sheets/sync", { method: "POST" });
      setMsg(res.ok ? `הסנכרון הושלם. ${res.rows?.toLocaleString("he-IL")} שורות עודכנו בגיליון.` : res.error || "נכשל");
    } catch (e) {
      setError(e instanceof Error ? e.message : "הסנכרון נכשל");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h2 className="section-title">קובץ Google Sheets של המוצרים באתר</h2>
      <p>
        זה גיליון נפרד מקובץ הקטלוג המקורי. הוא מתעדכן בכיוון אחד: כל שינוי בלוח הניהול (שם, מחיר, תגים, הסתרה, תמונה, מוצר חדש) אמור להופיע בגיליון אוטומטית, ואפשר גם ללחוץ על סנכרון מלא.
      </p>
      <p className="muted">
        סטטוס החיבור: {configured == null ? "בודק…" : configured ? "מוגדר ומוכן" : "עדיין לא הוגדר. ראו את ההוראות בתיעוד — חשבון שירות חינמי של Google וגיליון משותף."}
      </p>
      {error ? <p className="error-text">{error}</p> : null}
      {msg ? <p className="muted">{msg}</p> : null}
      <button className="btn btn-accent" type="button" disabled={busy || configured === false} onClick={() => void resync()}>
        {busy ? "מסנכרן…" : "סנכרון מלא עכשיו"}
      </button>
    </div>
  );
}
