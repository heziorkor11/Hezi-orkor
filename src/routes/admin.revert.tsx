import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminFetch } from "@/components/admin/api";
import adminCss from "@/styles/admin.css?url";

export const Route = createFileRoute("/admin/revert")({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : "" }),
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
  const { token } = Route.useSearch();
  const [state, setState] = useState<"busy" | "ok" | "err">("busy");
  const [message, setMessage] = useState("מבטל את השינוי…");

  useEffect(() => {
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
  }, [token]);

  const color = state === "ok" ? "#0f7a3a" : state === "err" ? "#e23b12" : "#111";

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 style={{ color }}>{state === "ok" ? "השינוי בוטל" : state === "err" ? "לא ניתן לבטל" : "ביטול שינוי"}</h1>
        <p className="lead">{message}</p>
        <p>
          <a href="/admin/activity">ליומן הפעילות</a>
        </p>
      </div>
    </div>
  );
}
