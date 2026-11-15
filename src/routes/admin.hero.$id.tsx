import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/shell";
import { adminFetch } from "@/components/admin/api";
import { ADMIN_HOME } from "@/lib/admin/paths";
import { resolveSlideImage, type HeroLinkType, type HeroTimerPosition, type HomeHeroSlide } from "@/lib/home-hero";
import { allTaxonomyCategories, categoryDisplayName } from "@/lib/display-taxonomy";

export const Route = createFileRoute("/admin/hero/$id")({
  component: HeroEditPage,
});

type FormState = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  linkType: HeroLinkType;
  linkTarget: string;
  startDate: string;
  endDate: string;
  timerEnabled: boolean;
  timerPosition: HeroTimerPosition;
  hidden: boolean;
  imagePreview?: string;
};

function fromSlide(s: HomeHeroSlide): FormState {
  return {
    title: s.title,
    subtitle: s.subtitle,
    ctaLabel: s.ctaLabel,
    linkType: s.linkType || "category",
    linkTarget: s.linkTarget || "",
    startDate: s.startDate || "",
    endDate: s.endDate || "",
    timerEnabled: Boolean(s.timerEnabled),
    timerPosition: s.timerPosition || "top",
    hidden: Boolean(s.hidden),
    imagePreview: resolveSlideImage(s),
  };
}

function HeroEditPage() {
  const { id } = Route.useParams();
  const { user } = useAdmin();
  const navigate = useNavigate();
  const [slide, setSlide] = useState<HomeHeroSlide | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user.role !== "master") return;
    void adminFetch<{ slides: HomeHeroSlide[] }>("/api/admin/hero")
      .then((d) => {
        const s = (d.slides || []).find((x) => x.id === id);
        if (!s) {
          setError("השקופית לא נמצאה");
          return;
        }
        setSlide(s);
        setForm(fromSlide(s));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "שגיאה"));
  }, [user.role, id]);

  function patch(partial: Partial<FormState>) {
    setForm((f) => (f ? { ...f, ...partial } : f));
  }

  async function save() {
    if (!form || !slide) return;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const res = await adminFetch<{ slides: HomeHeroSlide[] }>("/api/admin/hero", {
        method: "POST",
        body: JSON.stringify({
          update: {
            ...slide,
            title: form.title,
            subtitle: form.subtitle,
            ctaLabel: form.ctaLabel,
            linkType: form.linkType,
            linkTarget: form.linkTarget,
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
            timerEnabled: form.timerEnabled,
            timerPosition: form.timerPosition,
            hidden: form.hidden,
          },
        }),
      });
      const next = (res.slides || []).find((x) => x.id === id);
      if (next) {
        setSlide(next);
        setForm(fromSlide(next));
      }
      setSaved("השקופית נשמרה.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  function onPickImage(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setError("התמונה גדולה מ-2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      const base64 = url.split(",")[1] || "";
      setUploading(true);
      setError("");
      void adminFetch<{ image: string; slides: HomeHeroSlide[] }>("/api/admin/hero/image", {
        method: "POST",
        body: JSON.stringify({ slideId: id, imageBase64: base64, mimeType: file.type || "image/jpeg" }),
      })
        .then((res) => {
          const next = (res.slides || []).find((x) => x.id === id);
          if (next) {
            setSlide(next);
            setForm((f) => (f ? { ...fromSlide(next), ...f, imagePreview: res.image } : fromSlide(next)));
          } else {
            patch({ imagePreview: res.image });
          }
          setSaved("התמונה נשמרה.");
        })
        .catch((err) => setError(err instanceof Error ? err.message : "העלאה נכשלה"))
        .finally(() => setUploading(false));
    };
    reader.readAsDataURL(file);
  }

  if (user.role !== "master") {
    return (
      <div className="card">
        <h2 className="section-title">עריכת שקופית</h2>
        <p>המסך הזה למאסטר בלבד. עובד לא יכול לראות או לשנות את הבאנר בדף הבית.</p>
        <p className="muted">
          <Link from="/" to={ADMIN_HOME}>חזרה לסקירה</Link>
        </p>
      </div>
    );
  }

  if (!form && !error) return <p>טוען…</p>;
  if (!form) {
    return (
      <p className="error-text">
        {error || "שגיאה"} · <Link from="/" to="/admin/hero">חזרה לבאנר ראשי</Link>
      </p>
    );
  }

  const categories = allTaxonomyCategories;

  return (
    <>
      <Link from="/" to="/admin/hero" className="back-link">
        חזרה לבאנר ראשי
      </Link>

      <div className="card">
        <div className="field span-2">
          <label>תמונת השקופית</label>
          <div className="upload">
            {form.imagePreview ? <img src={form.imagePreview} alt="תמונה נוכחית" /> : <div className="thumb" />}
            <div>
              <label className="btn btn-sm btn-ghost" style={{ display: "inline-block", cursor: uploading ? "wait" : "pointer" }}>
                {uploading ? "מעלה…" : "החלף תמונה"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) onPickImage(file);
                  }}
                />
              </label>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                אפשר לבחור תמונה מהטלפון. JPEG, PNG או WebP עד 2MB. מומלץ רקע נקי, כמו בתמונות הקטגוריה.
              </div>
            </div>
          </div>
        </div>
        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="field span-2">
            <label>כותרת</label>
            <input value={form.title} onChange={(e) => patch({ title: e.target.value })} />
          </div>
          <div className="field span-2">
            <label>שורת הסבר</label>
            <textarea rows={2} value={form.subtitle} onChange={(e) => patch({ subtitle: e.target.value })} />
          </div>
          <div className="field span-2">
            <label>טקסט הכפתור</label>
            <input value={form.ctaLabel} onChange={(e) => patch({ ctaLabel: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="section-title">לאן הכפתור מוביל</h2>
        <div className="seg" role="tablist" aria-label="סוג קישור">
          {([
            ["category", "קטגוריה"],
            ["product", "מוצר"],
            ["search", "חיפוש"],
            ["whatsapp", "וואטסאפ"],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" className={form.linkType === id ? "on" : ""} onClick={() => patch({ linkType: id })}>
              {label}
            </button>
          ))}
        </div>
        {form.linkType === "help" ? (
          <p className="muted" style={{ margin: "12px 0 0", fontSize: 13 }}>
            השקופית הזו מובילה כרגע לעמוד «לא מצאת חלק?». בחירה בסוג אחר תחליף את הקישור.
          </p>
        ) : null}
        {form.linkType === "category" ? (
          <div className="field" style={{ marginTop: 12 }}>
            <label>בחירת קטגוריה</label>
            <select value={form.linkTarget} onChange={(e) => patch({ linkTarget: e.target.value })}>
              <option value="">בחרו קטגוריה</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryDisplayName(c.id, c.name)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {form.linkType === "product" ? (
          <div className="field" style={{ marginTop: 12 }}>
            <label>מק״ט מוצר</label>
            <input value={form.linkTarget} onChange={(e) => patch({ linkTarget: e.target.value })} dir="ltr" placeholder="HZ-…" />
          </div>
        ) : null}
        {form.linkType === "search" ? (
          <div className="field" style={{ marginTop: 12 }}>
            <label>מילות חיפוש</label>
            <input value={form.linkTarget} onChange={(e) => patch({ linkTarget: e.target.value })} placeholder="למשל רפידות בלם" />
          </div>
        ) : null}
        {form.linkType === "whatsapp" ? (
          <p className="muted" style={{ margin: "12px 0 0", fontSize: 13 }}>
            הכפתור יפתח וואטסאפ לשיחה עם החנות.
          </p>
        ) : null}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="section-title">תזמון (לא חובה)</h2>
        <p className="muted" style={{ margin: "0 0 12px", fontSize: 13 }}>
          אם ממלאים תאריכים, השקופית תופיע ותיעלם לבד לפי שעון ישראל. בסוף תאריך הסיום היא מוסתרת מהבאנר ונשארת ברשימה.
        </p>
        <div className="form-grid">
          <div className="field">
            <label>תאריך התחלה</label>
            <input type="date" value={form.startDate} onChange={(e) => patch({ startDate: e.target.value })} />
          </div>
          <div className="field">
            <label>תאריך סיום</label>
            <input type="date" value={form.endDate} onChange={(e) => patch({ endDate: e.target.value })} />
          </div>
        </div>
        <div className="toggle-row" style={{ marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <div>
            <div className="lbl">טיימר ספירה לאחור</div>
            <div className="hint">מוצג על השקופית עד תאריך הסיום, למשל «נשארו 2 ימים 05:12:30».</div>
          </div>
          <button
            className={`switch${form.timerEnabled ? "" : " off"}`}
            type="button"
            aria-label={form.timerEnabled ? "טיימר דלוק" : "טיימר כבוי"}
            onClick={() => patch({ timerEnabled: !form.timerEnabled })}
          />
        </div>
        {form.timerEnabled ? (
          <div className="field" style={{ marginTop: 8 }}>
            <label>מיקום הטיימר</label>
            <div className="seg seg-3" role="tablist" aria-label="מיקום טיימר">
              {([
                ["top", "למעלה"],
                ["button", "ליד הכפתור"],
                ["bottom", "למטה"],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" className={form.timerPosition === id ? "on" : ""} onClick={() => patch({ timerPosition: id })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {saved ? <p className="muted">{saved}</p> : null}
      <div className="form-actions">
        <button className="btn btn-accent" type="button" onClick={() => void save()} disabled={busy}>
          {busy ? "שומר…" : "שמור"}
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => void navigate({ from: "/", to: "/admin/hero" })}>
          ביטול
        </button>
      </div>
    </>
  );
}
