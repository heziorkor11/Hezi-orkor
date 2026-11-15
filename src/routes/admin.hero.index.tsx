import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch } from "@/components/admin/api";
import { ADMIN_HOME } from "@/lib/admin/paths";
import { resolveSlideImage, type HomeHeroSlide } from "@/lib/home-hero";
import { formatScheduleRangeHe, isSlideScheduleEnded, timerPositionOf } from "@/lib/home-hero-schedule";

export const Route = createFileRoute("/admin/hero/")({
  component: HeroListPage,
});

const POS_HE: Record<string, string> = { top: "למעלה", button: "ליד הכפתור", bottom: "למטה" };

function HeroListPage() {
  const { user } = useAdmin();
  const navigate = useNavigate();
  const [slides, setSlides] = useState<HomeHeroSlide[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user.role !== "master") return;
    void adminFetch<{ slides: HomeHeroSlide[] }>("/api/admin/hero")
      .then((d) => setSlides(d.slides || []))
      .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, [user.role]);

  async function save(next: HomeHeroSlide[]) {
    setBusy(true);
    setError("");
    try {
      const res = await adminFetch<{ slides: HomeHeroSlide[] }>("/api/admin/hero", {
        method: "POST",
        body: JSON.stringify({ slides: next }),
      });
      setSlides(res.slides);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  async function addSlide() {
    setBusy(true);
    setError("");
    try {
      const res = await adminFetch<{ slides: HomeHeroSlide[] }>("/api/admin/hero", {
        method: "POST",
        body: JSON.stringify({ add: { title: "שקופית חדשה", subtitle: "", ctaLabel: "לפרטים", tone: "ember" } }),
      });
      setSlides(res.slides);
      const created = res.slides[res.slides.length - 1];
      if (created) await navigate({ from: "/", to: "/admin/hero/$id", params: { id: created.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  if (user.role !== "master") {
    return (
      <div className="card">
        <h2 className="section-title">באנר ראשי</h2>
        <p>המסך הזה למאסטר בלבד. עובד לא יכול לראות או לשנות את הבאנר בדף הבית.</p>
        <p className="muted">
          <Link from="/" to={ADMIN_HOME}>חזרה לסקירה</Link>
        </p>
      </div>
    );
  }

  if (!slides && !error) return <p>טוען…</p>;

  return (
    <>
      <p className="muted" style={{ margin: "0 0 14px", fontSize: 13, lineHeight: 1.45 }}>
        כאן שולטים בשקופיות של הבאנר הגדול בדף הבית: תמונה, טקסט, כפתור, סדר ותזמון. שקופית שהוסתרה נשארת ברשימה ואפשר להציג אותה שוב — בלי למחוק.
      </p>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="toolbar-row">
        <button className="btn btn-accent" type="button" onClick={() => void addSlide()} disabled={busy}>
          + שקופית חדשה
        </button>
      </div>
      {(slides || []).map((slide, i) => {
        const img = resolveSlideImage(slide);
        const ended = isSlideScheduleEnded(slide);
        const scheduled = Boolean(slide.startDate || slide.endDate);
        const range = formatScheduleRangeHe(slide.startDate, slide.endDate);
        return (
          <article key={slide.id} className={`slide-card${slide.hidden ? " hidden-slide" : ""}`}>
            <div className="slide-top">
              <div className="handle" title="שינוי סדר עם החיצים">⋮⋮</div>
              {img ? <img className="thumb" src={img} alt="" /> : <div className="thumb" />}
              <div className="slide-meta">
                <div className="slide-title">{slide.title}</div>
                <div className="slide-sub">{slide.subtitle}</div>
              </div>
              <div className="reorder">
                <button
                  className="icon-btn"
                  type="button"
                  aria-label="העלאה"
                  disabled={busy || i === 0}
                  onClick={() => {
                    const next = [...(slides || [])];
                    [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                    void save(next);
                  }}
                >
                  ▲
                </button>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label="הורדה"
                  disabled={busy || i === (slides || []).length - 1}
                  onClick={() => {
                    const next = [...(slides || [])];
                    [next[i], next[i + 1]] = [next[i + 1]!, next[i]!];
                    void save(next);
                  }}
                >
                  ▼
                </button>
              </div>
            </div>
            <div className="badge-row">
              {slide.hidden ? <span className="chip off">מוסתר</span> : <span className="chip new">מוצג</span>}
              {ended ? (
                <span className="chip off">הסתיים{range ? ` · ${range}` : ""}</span>
              ) : scheduled ? (
                <span className="chip rec">מתוזמן{range ? ` · ${range}` : ""}</span>
              ) : (
                <span className="chip">בלי תזמון · תמיד בבאנר</span>
              )}
              {slide.timerEnabled && !slide.hidden ? (
                <span className="chip sale">טיימר · {POS_HE[timerPositionOf(slide)]}</span>
              ) : null}
              {slide.linkType === "whatsapp" ? <span className="chip">קישור · וואטסאפ</span> : null}
            </div>
            <div className="actions-row">
              <Link from="/" to="/admin/hero/$id" params={{ id: slide.id }} className="btn btn-sm btn-ghost">
                עריכה
              </Link>
              <div className="toggle-mini">
                <button
                  className={`switch${slide.hidden ? " off" : ""}`}
                  type="button"
                  aria-label={slide.hidden ? "מוסתר" : "מוצג"}
                  disabled={busy}
                  onClick={() => {
                    const next = (slides || []).map((s) => (s.id === slide.id ? { ...s, hidden: !s.hidden } : s));
                    void save(next);
                  }}
                />
                {slide.hidden ? "הצג שוב" : "מוצג"}
              </div>
            </div>
          </article>
        );
      })}
      <button className="add-card" type="button" onClick={() => void addSlide()} disabled={busy}>
        <div className="plus">+</div>
        + שקופית חדשה
      </button>
    </>
  );
}
