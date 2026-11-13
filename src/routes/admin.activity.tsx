import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch, formatWhen } from "@/components/admin/api";
import type { ActivityEntry } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  const { user } = useAdmin();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      const d = await adminFetch<{ entries: ActivityEntry[] }>("/api/admin/activity");
      setEntries(d.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function revert(id: string) {
    if (!confirm("לבטל את השינוי ולהחזיר את המצב הקודם?")) return;
    await adminFetch(`/api/admin/activity/${id}/revert`, { method: "POST", body: "{}" });
    await load();
  }

  return (
    <>
      <p className="muted">
        יומן זה מתעד שינויי קטלוג בלבד (בלי פרטי לקוח). שינוי של עובד עולה לאתר מיד, והמאסטר מקבל דוא״ל עם כפתור «בטל».
        {user.role === "master" ? (
          <>
            {" "}
            <Link to="/admin/mail-preview">תצוגת דוא״ל לדוגמה</Link>
          </>
        ) : null}
      </p>
      {error ? <p className="error-text">{error}</p> : null}
      {entries.length === 0 ? <p className="muted">אין רשומות עדיין.</p> : null}
      <div className="card">
        {entries.map((e) => (
          <div key={e.id} className="log-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>
                <span className="who">{e.actorName}</span> · {e.action}{" "}
                {e.reverted ? <span className="chip">בוטל{e.revertedBy ? ` · ${e.revertedBy}` : ""}</span> : <span className="chip new">עלה לאתר</span>}
              </div>
              <div className="sku">{e.target}</div>
              <div className="diff">
                <span className="from">{JSON.stringify(e.before)}</span> → <span className="to">{JSON.stringify(e.after)}</span>
              </div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div className="when">{formatWhen(e.at)}</div>
              {user.role === "master" && !e.reverted ? (
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-sm btn-danger" type="button" onClick={() => void revert(e.id)}>בטל</button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
