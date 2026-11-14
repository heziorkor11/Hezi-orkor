import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch } from "@/components/admin/api";
import type { SafeUser } from "@/lib/admin/types";
import { ADMIN_HOME } from "@/lib/admin/paths";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const { user } = useAdmin();
  const navigate = useNavigate();
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"worker" | "master">("worker");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (user.role !== "master") {
      void navigate({ from: "/", to: ADMIN_HOME });
      return;
    }
    void adminFetch<{ users: SafeUser[] }>("/api/admin/users")
      .then((d) => setUsers(d.users))
      .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, [user.role, navigate]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaved("");
    try {
      const res = await adminFetch<{ users: SafeUser[] }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ name, username, password, role }),
      });
      setUsers(res.users);
      setName("");
      setUsername("");
      setPassword("");
      setSaved("העובד נוסף. הסיסמה לא מוצגת שוב.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    }
  }

  async function toggle(u: SafeUser) {
    const res = await adminFetch<{ users: SafeUser[] }>(`/api/admin/users/${u.id}`, {
      method: "POST",
      body: JSON.stringify({ active: !u.active }),
    });
    setUsers(res.users);
  }

  if (user.role !== "master") return null;

  return (
    <div className="grid-2">
      <div className="card">
        <h2 className="section-title">משתמשים</h2>
        {users.map((u) => (
          <div key={u.id} className="log-row">
            <div className="avatar">{u.name.slice(0, 1)}</div>
            <div style={{ flex: 1 }}>
              <div className="who">{u.name}</div>
              <div className="sku">{u.username} · {u.role === "master" ? "מאסטר" : "עובד"}</div>
            </div>
            <div>
              {u.active ? <span className="chip new">פעיל</span> : <span className="chip">מושבת</span>}
              {u.id !== "user_master" ? (
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-sm btn-ghost" type="button" onClick={() => void toggle(u)}>
                    {u.active ? "השבתה" : "הפעלה"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <form className="card" onSubmit={(e) => void add(e)}>
        <h2 className="section-title">הוספת עובד</h2>
        <div className="form-grid">
          <div className="field span-2">
            <label>שם מלא</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>שם משתמש</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required dir="ltr" />
          </div>
          <div className="field">
            <label>סיסמה (8 תווים לפחות)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div className="field">
            <label>תפקיד</label>
            <select value={role} onChange={(e) => setRole(e.target.value as "worker" | "master")}>
              <option value="worker">עובד</option>
              <option value="master">מאסטר</option>
            </select>
          </div>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        {saved ? <p className="muted">{saved}</p> : null}
        <button className="btn btn-accent" type="submit" style={{ marginTop: 14 }}>הוספה</button>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          משתמשים נשמרים באחסון פרטי זמני (לא בריפו הציבורי). לשימור קבוע צריך מאגר פרטי אחרי אישור.
        </p>
      </form>
    </div>
  );
}
