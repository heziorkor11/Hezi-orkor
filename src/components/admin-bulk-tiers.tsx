import { useEffect, useState, type FormEvent } from "react";
import { adminRequest } from "@/lib/admin/client";
import type { BulkRule } from "@/lib/admin/types";
const blank = (): BulkRule => ({
  id: "",
  targetType: "category",
  target: "workshop-packs",
  enabled: true,
  public: true,
  aggregate: false,
  tiers: [{ minPacks: 2, percent: 0 }],
});
export function AdminBulkTiers() {
  const [rules, setRules] = useState<BulkRule[]>([]);
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    adminRequest<BulkRule[]>("bulk-tiers")
      .then(setRules)
      .catch((e) => setMessage(e.message));
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { id, ...data } = form;
      const result = await adminRequest<BulkRule>("bulk-tiers", "POST", {
        ...data,
        ...(id ? { id } : {}),
      });
      setRules((old) => [...old.filter((r) => r.id !== result.id), result]);
      setForm(blank());
      setMessage("המדרגות נשמרו");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ad-stack">
      <h1>מדרגות כמות למוסכים</h1>
      <p className="ad-note">
        אין הנחות אוטומטיות עד לשמירה. הכמות היא מספר מארזים / מיכלים, לא מספר יחידות בתוך המארז.
        המחירים כוללים מע״מ. כלל מוצר גובר על כלל קטגוריה; אין כפל הנחה עם מבצע — המחיר הזול
        מביניהם.
      </p>
      <p role="status">{message}</p>
      {rules.map((r) => (
        <button key={r.id} className="ad-card" onClick={() => setForm(r)}>
          {r.target} · {r.enabled ? "פעיל" : "כבוי"} · {r.public ? "מחיר פומבי" : "הצעת מחיר בלבד"}{" "}
          · {r.tiers.length} מדרגות · עריכה
        </button>
      ))}
      <form className="ad-card ad-stack" onSubmit={save}>
        <label className="ad-field">
          יעד
          <select
            value={form.targetType}
            onChange={(e) =>
              setForm({
                ...form,
                targetType: e.target.value as BulkRule["targetType"],
                target: e.target.value === "category" ? "workshop-packs" : "",
                aggregate: false,
              })
            }
          >
            <option value="category">קטגוריית מארזים</option>
            <option value="product">מוצר מארזים מסוים</option>
          </select>
        </label>
        <label className="ad-field">
          {form.targetType === "product" ? "מק״ט מוצר" : "קטגוריה"}
          <input
            required
            dir="ltr"
            readOnly={form.targetType === "category"}
            value={form.target}
            onChange={(e) => setForm({ ...form, target: e.target.value.trim().toUpperCase() })}
          />
        </label>
        <label className="ad-switch-row">
          פעיל
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
        </label>
        <label className="ad-switch-row">
          מחירים פומביים (כבוי = פנייה להצעת מחיר בלבד)
          <input
            type="checkbox"
            checked={form.public}
            onChange={(e) => setForm({ ...form, public: e.target.checked })}
          />
        </label>
        <label className="ad-switch-row">
          צבירת מארזים בין מק״טים באותה קטגוריה
          <input
            type="checkbox"
            disabled={form.targetType !== "category"}
            checked={form.aggregate}
            onChange={(e) => setForm({ ...form, aggregate: e.target.checked })}
          />
        </label>
        {form.tiers.map((t, i) => (
          <fieldset key={i} className="ad-card">
            <legend>מדרגה {i + 1}</legend>
            <label className="ad-field">
              מינימום מארזים
              <input
                type="number"
                min="1"
                max="100000"
                required
                value={t.minPacks}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tiers: form.tiers.map((x, j) =>
                      j === i ? { ...x, minPacks: Number(e.target.value) } : x,
                    ),
                  })
                }
              />
            </label>
            <label className="ad-field">
              אחוז הנחה
              <input
                type="number"
                min="0"
                max="99.99"
                step="0.01"
                required
                value={t.percent}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tiers: form.tiers.map((x, j) =>
                      j === i ? { ...x, percent: Number(e.target.value) } : x,
                    ),
                  })
                }
              />
            </label>
            {form.tiers.length > 1 && (
              <button
                type="button"
                className="ad-button ad-secondary"
                onClick={() => setForm({ ...form, tiers: form.tiers.filter((_, j) => j !== i) })}
              >
                הסר מדרגה מהטיוטה
              </button>
            )}
          </fieldset>
        ))}
        <button
          type="button"
          className="ad-button ad-secondary"
          disabled={form.tiers.length >= 20}
          onClick={() =>
            setForm({
              ...form,
              tiers: [
                ...form.tiers,
                {
                  minPacks: form.tiers[form.tiers.length - 1].minPacks + 1,
                  percent: form.tiers[form.tiers.length - 1].percent,
                },
              ],
            })
          }
        >
          הוסף מדרגה
        </button>
        <button className="ad-button" disabled={busy}>
          שמור מדרגות
        </button>
        <button type="button" className="ad-button ad-secondary" onClick={() => setForm(blank())}>
          כלל חדש
        </button>
      </form>
    </section>
  );
}
