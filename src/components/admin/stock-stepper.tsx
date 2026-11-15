export function StockStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const trimmed = value.trim();
  const n = trimmed === "" ? null : /^\d+$/.test(trimmed) ? Number(trimmed) : null;
  const valid = trimmed === "" || n != null;
  function setQty(q: number) {
    onChange(String(Math.max(0, Math.floor(q))));
  }
  return (
    <div className="field">
      <label>מלאי (כמות)</label>
      <div className="stock-stepper">
        <button type="button" className="btn" onClick={() => setQty((n ?? 1) - 1)} disabled={n != null && n <= 0}>
          −
        </button>
        <input
          inputMode="numeric"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="לא מנוהל"
          aria-label="כמות במלאי"
        />
        <button type="button" className="btn" onClick={() => setQty((n ?? -1) + 1)}>
          +
        </button>
        {value !== "" ? (
          <button type="button" className="btn btn-ghost" onClick={() => onChange("")}>
            נקה
          </button>
        ) : null}
      </div>
      {!valid ? <p className="error-text">כמות חייבת להיות מספר שלם 0 ומעלה, או ריקה.</p> : null}
      <p className="muted" style={{ marginTop: 6 }}>
        ריק = המלאי אינו מנוהל. 0 מציג «אזל מהמלאי» בחנות. הכמות משתנה רק ידנית — הזמנה לא מורידה מלאי לבד.
      </p>
    </div>
  );
}
