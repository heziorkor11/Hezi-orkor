import { FormEvent, useId, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { formatIlPlate, isValidIlPlate, normalizeIlPlate } from "@/lib/order-quote";
import type { PlateLookupResult } from "@/lib/mot-plate-lookup";
import { applyPlateLookup, fetchVehicleByPlate } from "@/lib/plate-lookup-client";
import { isRetryablePlateFailure } from "@/lib/plate-fetch-retry";
import type { ProductFilter } from "@/lib/catalog-types";
import { cn } from "@/lib/utils";
import { PlateVehicleCard } from "@/components/plate-vehicle-card";

function formatWhileTyping(raw: string) {
  const d = normalizeIlPlate(raw).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
  if (d.length <= 7) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export function PlateSearch({
  compact = false,
  showInlineResult = true,
}: {
  compact?: boolean;
  /** On the home page, show unmapped / error cards under the plate. */
  showInlineResult?: boolean;
}) {
  const navigate = useNavigate();
  const location = useRouterState({
    select: (s) => ({ path: s.location.pathname, search: s.location.search as ProductFilter }),
  });
  const inputId = useId();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [inline, setInline] = useState<PlateLookupResult | null>(null);
  const [typedPlate, setTypedPlate] = useState("");
  const [retryingAuto, setRetryingAuto] = useState(false);

  async function onSubmit(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    const plate = normalizeIlPlate(value);
    setTypedPlate(plate);
    if (!isValidIlPlate(plate)) {
      setInline({
        ok: false,
        error: "invalid",
        message: "יש להזין מספר רכב ישראלי בן 7 או 8 ספרות.",
      });
      return;
    }
    setBusy(true);
    setRetryingAuto(false);
    setInline(null);
    try {
      const data = await fetchVehicleByPlate(plate, { onRetry: () => setRetryingAuto(true) });
      const applied = await applyPlateLookup({
        plate,
        result: data,
        path: location.path,
        search: location.search,
        navigate,
      });
      if (applied.ok && applied.found && applied.vehicle.mapping.confidence === "mapped") {
        return;
      }
      setInline(applied);
    } catch {
      setInline({
        ok: false,
        error: "upstream",
        message: "לא הצלחנו לשאול את מאגר משרד הרישוי. נסו שוב או בחרו רכב ידנית.",
      });
    } finally {
      setBusy(false);
      setRetryingAuto(false);
    }
  }

  return (
    <div className={cn("w-full", compact ? "" : "rounded-2xl border border-line bg-card p-3.5 shadow-lift md:p-4")}>
      {compact ? null : (
        <div className="mb-3">
          <h2 className="text-[17px] font-extrabold md:text-xl">חיפוש לפי מספר רישוי</h2>
          <p className="mt-1 text-xs text-muted md:text-sm">
            הזינו את מספר הרכב ממשרד הרישוי. נזהה יצרן, דגם ושנה ונתאים לקטלוג רק כשההתאמה ודאית.
          </p>
        </div>
      )}
      <form onSubmit={onSubmit} className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <label htmlFor={inputId} className={compact ? "sr-only" : "sr-only"}>
          מספר רישוי ישראלי
        </label>
        <div className="il-plate" dir="ltr">
          <div className="il-plate-band" aria-hidden="true">
            <span className="il-plate-flag" />
            <span className="il-plate-il">IL</span>
          </div>
          <input
            id={inputId}
            name="plate"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={10}
            placeholder="12-345-67"
            value={value}
            onChange={(e) => {
              setValue(formatWhileTyping(e.target.value));
              if (inline) setInline(null);
            }}
            data-plate="input"
            aria-invalid={inline && !inline.ok && inline.error === "invalid" ? true : undefined}
            aria-describedby={inline ? `${inputId}-status` : undefined}
            className="il-plate-input"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="sq-btn min-h-11 shrink-0 bg-accent px-4 text-sm font-extrabold text-on-accent hover:bg-accent-hot disabled:opacity-60"
        >
          {busy ? (retryingAuto ? "מנסים שוב…" : "בודקים…") : compact ? "חפש רכב" : "חפש חלקים לרכב"}
        </button>
      </form>
      {inline ? (
        <p id={`${inputId}-status`} className="mt-2 text-xs text-muted md:text-sm" role="status">
          {!inline.ok ? inline.message : !inline.found ? inline.message : null}
        </p>
      ) : compact ? (
        <p className="mt-1.5 text-[11px] text-muted">7 או 8 ספרות, לפי מספר הרכב במשרד הרישוי</p>
      ) : null}
      {showInlineResult && inline && (inline.ok === false || (inline.ok && !inline.found) || (inline.ok && inline.found)) ? (
        <div className="mt-3">
          {inline.ok && inline.found ? (
            <PlateVehicleCard plate={typedPlate || normalizeIlPlate(value)} result={inline} />
          ) : inline.ok && !inline.found ? (
            <div className="rounded-xl border border-line bg-panel p-3 text-sm">
              <p>{inline.message}</p>
            </div>
          ) : !inline.ok && inline.error !== "invalid" ? (
            <div className="rounded-xl border border-line bg-panel p-3 text-sm">
              <p>{inline.message}</p>
              {isRetryablePlateFailure(inline) ? (
                <button
                  type="button"
                  onClick={() => void onSubmit()}
                  disabled={busy}
                  data-plate="retry"
                  className="sq-btn mt-2.5 min-h-11 bg-accent px-4 text-sm font-extrabold text-on-accent hover:bg-accent-hot disabled:opacity-60"
                >
                  {busy ? "מנסים שוב…" : "נסו שוב"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { formatWhileTyping, formatIlPlate };
