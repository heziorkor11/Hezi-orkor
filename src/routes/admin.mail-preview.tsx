import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch } from "@/components/admin/api";
import { ADMIN_HOME } from "@/lib/admin/paths";

export const Route = createFileRoute("/admin/mail-preview")({
  component: MailPreviewPage,
  head: () => ({
    meta: [
      { title: "דוא״ל והתראות · חזי אורקור" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function MailPreviewPage() {
  const { user } = useAdmin();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    if (user.role !== "master") void navigate({ from: "/", to: ADMIN_HOME });
  }, [user.role, navigate]);

  useEffect(() => {
    if (user.role !== "master") return;
    void adminFetch<{ configured: boolean; to: string | null }>("/api/admin/mail/status")
      .then((s) => {
        setConfigured(s.configured);
        setTo(s.to);
      })
      .catch((e) => setStatus({ kind: "err", text: e instanceof Error ? e.message : "לא ניתן לטעון את מצב הדוא״ל" }));
  }, [user.role]);

  if (user.role !== "master") return null;

  async function sendTest() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await adminFetch<{ sent: boolean; message: string }>("/api/admin/mail/test", {
        method: "POST",
        body: "{}",
      });
      setStatus({ kind: res.sent ? "ok" : "err", text: res.message });
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "שליחת מייל הבדיקה נכשלה" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="section-title" style={{ marginBottom: 8 }}>הגדרות דוא״ל והתראות</div>
      <p className="muted" style={{ marginBottom: 16 }}>
        כאן אפשר לראות איך נראית התראת «בטל» ולשלוח מייל בדיקה לתיבת המאסטר. מייל הבדיקה מסומן כדוגמה, וקישור הביטול שבו אינו מבטל שינוי אמיתי.
      </p>
      <p className="muted" style={{ marginBottom: 16 }}>
        {configured == null
          ? "בודק הגדרות…"
          : configured
            ? `Gmail מוגדר. תיבת הייעוד: ${to || "הכתובת שהוגדרה בשרת"}.`
            : "Gmail אינו מוגדר במלואו בשרת התצוגה. שליחה תיכשל עד שיעודכנו המשתנים."}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <button className="btn btn-accent" type="button" disabled={busy} onClick={() => void sendTest()}>
          {busy ? "שולח…" : "שלח מייל בדיקה"}
        </button>
      </div>
      {status ? (
        <p
          role="status"
          style={{
            marginBottom: 18,
            padding: "10px 12px",
            borderRadius: 12,
            background: status.kind === "ok" ? "#e8f6ee" : "#fdecea",
            color: status.kind === "ok" ? "#0f7a3a" : "#b42318",
            fontWeight: 700,
          }}
        >
          {status.text}
        </p>
      ) : null}

      <div className="mail-bg card" style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="mail-body">
          <p className="muted" style={{ fontSize: 12, fontWeight: 700, background: "#fff6e8", border: "1px solid #e8c36a", borderRadius: 12, padding: "8px 10px" }}>
            זו תצוגת דוגמה של הדוא״ל. קישור «בטל» כאן הוא לדוגמה ואינו מבטל שינוי אמיתי.
          </p>
          <h2>שינוי של עובד עלה לאתר</h2>
          <p>השינוי כבר מוצג בחנות. אם הוא שגוי — לחצו «בטל» כדי להחזיר את המוצר למצב הקודם.</p>
          <p>
            <b>מי:</b> יואב לוי (עובד, דוגמה)
            <br />
            <b>מה:</b> עריכת מוצר (price)
            <br />
            <b>יעד:</b> HZ-CAF-00195
            <br />
            <b>מתי:</b> 13.11.2026, 16:40 (שעון ישראל)
          </p>
          <p>
            <s>11 ₪</s> → <b>13 ₪</b>
          </p>
          <p>
            <a className="btn btn-danger" href="/admin/revert?sample=1">
              בטל
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
