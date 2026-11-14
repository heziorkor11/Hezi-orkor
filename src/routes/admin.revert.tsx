import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminFetch } from "@/components/admin/api";
import adminCss from "@/styles/admin.css?url";

export const Route = createFileRoute("/admin/revert")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
    sample: s.sample === "1" || s.sample === true,
  }),
  head: () => ({
    meta: [
      { title: "ביטול שינוי · חזי אורקור" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "stylesheet", href: adminCss }],
  }),
  component: RevertPage,
});

function RevertPage() {
  const { token, sample } = Route.useSearch();
  const [state, setState] = useState<"busy" | "ok" | "err" | "sample">(sample ? "sample" : "busy");
  const [message, setMessage] = useState(
    sample ? "זה קישור לדוגמה בלבד — הוא לא מבטל שינוי אמיתי באתר." : "מבטל את השינוי…",
  );

  useEffect(() => {
    if (sample) {
      setState("sample");
      setMessage("זה קישור לדוגמה בלבד — הוא לא מבטל שינוי אמיתי באתר.");
      return;
    }
    if (!token) {
      setState("err");
      setMessage("חסר קישור ביטול.");
      return;
    }
    void adminFetch("/api/admin/revert-by-token", { method: "POST", body: JSON.stringify({ token }) })
      .then(() => {
        setState("ok");
        setMessage("השינוי בוטל והמוצר חזר למצב הקודם.");
      })
      .catch((e) => {
        setState("err");
        setMessage(e instanceof Error ? e.message : "לא ניתן לבטל");
      });
  }, [token, sample]);

  const color = state === "ok" ? "#0f7a3a" : state === "err" ? "#e23b12" : "#111";
  const title = state === "ok" ? "השינוי בוטל" : state === "err" ? "לא ניתן לבטל" : state === "sample" ? "קישור לדוגמה" : "ביטול שינוי";

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 style={{ color }}>{title}</h1>
        <p className="lead">{message}</p>
        <p>
          <a href="/admin/activity">ליומן הפעילות</a>
        </p>
      </div>
    </div>
  );
}
