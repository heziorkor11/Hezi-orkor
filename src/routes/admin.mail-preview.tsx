import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch } from "@/components/admin/api";
import { ADMIN_HOME } from "@/lib/admin/paths";
import {
  NOTIFICATION_MAIL_TYPES,
  type NotificationSettings,
} from "@/lib/admin/notification-settings";

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
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [extraText, setExtraText] = useState("");
  const [allowCustomer, setAllowCustomer] = useState(false);

  useEffect(() => {
    if (user.role !== "master") void navigate({ from: "/", to: ADMIN_HOME });
  }, [user.role, navigate]);

  useEffect(() => {
    if (user.role !== "master") return;
    void adminFetch<{
      configured: boolean;
      to: string | null;
      settings: NotificationSettings;
      allowCustomerOrderEmail: boolean;
    }>("/api/admin/notification-settings")
      .then((s) => {
        setConfigured(s.configured);
        setTo(s.to);
        setSettings(s.settings);
        setExtraText(s.settings.extraAddresses.join("\n"));
        setAllowCustomer(s.allowCustomerOrderEmail);
      })
      .catch((e) => setStatus({ kind: "err", text: e instanceof Error ? e.message : "לא ניתן לטעון את מצב הדוא״ל" }));
  }, [user.role]);

  if (user.role !== "master") return null;

  async function save() {
    if (!settings) return;
    setSaving(true);
    setStatus(null);
    try {
      const extraAddresses = extraText
        .split(/[,\n;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await adminFetch<{ settings: NotificationSettings }>("/api/admin/notification-settings", {
        method: "POST",
        body: JSON.stringify({ ...settings, extraAddresses }),
      });
      setSettings(res.settings);
      setExtraText(res.settings.extraAddresses.join("\n"));
      setStatus({ kind: "ok", text: "ההגדרות נשמרו." });
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "שמירה נכשלה" });
    } finally {
      setSaving(false);
    }
  }

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
        כתובות נוספות מקבלות העתק של הזמנה חדשה, סיכומים והתראות מלאי. מייל שינוי עובד (עם קישור «בטל») נשאר רק בתיבת המאסטר.
        אישור ללקוח נשלח רק בייצור ורק אם מילא דוא״ל בעגלה.
      </p>
      <p className="muted" style={{ marginBottom: 16 }}>
        {configured == null
          ? "בודק הגדרות…"
          : configured
            ? `Gmail מוגדר. תיבת המאסטר: ${to || "הכתובת שהוגדרה בשרת"}.`
            : "Gmail אינו מוגדר במלואו בשרת. שליחה תיכשל עד שיעודכנו המשתנים."}
        {allowCustomer ? "" : " בתצוגה זו לא נשלח דוא״ל לכתובת של לקוח."}
      </p>

      {settings ? (
        <div className="card" style={{ marginBottom: 18 }}>
          <h2 className="section-title">סוגי הודעות</h2>
          <ul className="mail-toggles">
            {NOTIFICATION_MAIL_TYPES.map((row) => (
              <li key={row.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={settings.enabled[row.id]}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        enabled: { ...settings.enabled, [row.id]: e.target.checked },
                      })
                    }
                  />
                  <span>
                    <b>{row.label}</b>
                    <span className="muted"> — {row.hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="field" style={{ marginTop: 12 }}>
            <label>כתובות נוספות (שורה או פסיק בין כתובות)</label>
            <textarea
              rows={3}
              dir="ltr"
              value={extraText}
              onChange={(e) => setExtraText(e.target.value)}
              placeholder="office@example.com"
              style={{ width: "100%", textAlign: "left" }}
            />
          </div>
          <div className="field">
            <label>סף מלאי נמוך</label>
            <input
              inputMode="numeric"
              dir="ltr"
              value={String(settings.lowStockThreshold)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^\d]/g, ""));
                if (Number.isInteger(n) && n >= 0 && n <= 9999) {
                  setSettings({ ...settings, lowStockThreshold: n });
                }
              }}
              style={{ maxWidth: 120 }}
            />
          </div>
          <button className="btn btn-accent" type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "שומר…" : "שמור הגדרות"}
          </button>
        </div>
      ) : null}

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
            background: status.kind === "ok" ? "#e8f6ee" : status.kind === "info" ? "#eef2f7" : "#fdecea",
            color: status.kind === "ok" ? "#0f7a3a" : status.kind === "info" ? "#1a1a1a" : "#b42318",
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
