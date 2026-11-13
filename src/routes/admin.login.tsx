import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { adminFetch } from "@/components/admin/api";

export const Route = createFileRoute("/admin/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "כניסה לניהול · חזי אורקור" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await adminFetch("/api/admin/login", { method: "POST", body: JSON.stringify({ username, password }) });
      void navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "הכניסה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={(e) => void onSubmit(e)}>
        <img className="logo" src="/brand/logo.jpg" alt="חזי אורקור" />
        <h1>כניסה לניהול האתר</h1>
        <p className="lead">חזי אורקור · לוחמי הגטאות 24, נהריה</p>
        <div className="field" style={{ marginBottom: 10 }}>
          <label htmlFor="admin-user">שם משתמש או דוא״ל</label>
          <input id="admin-user" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="החשבון שקיבלתם מהמנהל" />
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="admin-pass">סיסמה</label>
          <input id="admin-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error ? <div className="error-text">{error}</div> : null}
        <button className="btn btn-accent" style={{ width: "100%" }} type="submit" disabled={busy}>
          {busy ? "נכנס…" : "כניסה"}
        </button>
        <div className="roles">
          <div className="role-box">
            <b>מאסטר</b>
            <span>שליטה מלאה: הזמנות, מחירים, קטגוריות, תגים, משתמשים, וביטול שינויי עובד</span>
          </div>
          <div className="role-box">
            <b>עובד</b>
            <span>מוצרים והזמנות. שינוי עולה לאתר מיד; המנהל מקבל התראה ויכול לבטל</span>
          </div>
        </div>
        <p className="note">התפקיד נקבע על ידי המאסטר. אין בחירת תפקיד במסך הכניסה.</p>
      </form>
    </div>
  );
}
