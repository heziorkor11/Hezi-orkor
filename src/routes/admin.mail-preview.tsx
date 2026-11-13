import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAdmin } from "@/components/admin/shell";
import { ADMIN_HOME } from "@/lib/admin/paths";

export const Route = createFileRoute("/admin/mail-preview")({
  component: MailPreviewPage,
});

function MailPreviewPage() {
  const { user } = useAdmin();
  const navigate = useNavigate();
  useEffect(() => {
    if (user.role !== "master") void navigate({ from: "/", to: ADMIN_HOME });
  }, [user.role, navigate]);
  if (user.role !== "master") return null;
  return (
    <div className="mail-bg card" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="mail-body">
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
          <a className="btn btn-danger" href="/admin/activity">
            בטל
          </a>
        </p>
        <p className="muted" style={{ fontSize: 12 }}>
          זו תצוגת דוגמה של הדוא״ל. הקישור האמיתי חתום וחד־פעמי, ונשלח רק כשמוגדרות ההגדרות של Gmail.
        </p>
      </div>
    </div>
  );
}
