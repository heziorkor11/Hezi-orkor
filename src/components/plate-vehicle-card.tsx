import { Link } from "@tanstack/react-router";
import { formatIlPlate } from "@/lib/order-quote";
import type { PlateLookupResult } from "@/lib/mot-plate-lookup";
import type { CategoryTile } from "@/lib/category-tiles";
import { isMappedPlateResult } from "@/lib/plate-session";
import { isRetryablePlateFailure } from "@/lib/plate-fetch-retry";
import { hasRealProductImage } from "@/lib/product-image-policy";
import { cn } from "@/lib/utils";

export function PlateVehicleCard({
  plate,
  result,
  tiles = [],
  onClear,
  onRetry,
  retrying = false,
}: {
  plate: string;
  result: PlateLookupResult;
  tiles?: CategoryTile[];
  onClear?: () => void;
  /** Shown as a "נסו שוב" button when the lookup was blocked / busy. */
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const mapped = isMappedPlateResult(result);
  const canRetry = Boolean(onRetry) && isRetryablePlateFailure(result);
  const vehicle = result.ok && result.found ? result.vehicle : undefined;
  const details = vehicle
    ? [
        vehicle.year ? `שנת ${vehicle.year}` : "",
        vehicle.trim ? `רמת גימור ${vehicle.trim}` : "",
        vehicle.fuel || "",
        vehicle.engine ? `מנוע ${vehicle.engine}` : "",
        vehicle.displacement ? `${vehicle.displacement} סמ״ק` : "",
      ].filter(Boolean)
    : [];

  return (
    <section
      className="rounded-2xl border border-line bg-card p-3.5 shadow-lift md:p-4"
      aria-label="תוצאת חיפוש לפי מספר רישוי"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-muted">חיפוש לפי מספר רישוי · משרד הרישוי</p>
          {vehicle ? (
            <>
              <h2 className="mt-0.5 text-lg font-extrabold leading-snug md:text-xl">
                {vehicle.manufacturer}
                {vehicle.commercialName ? ` · ${vehicle.commercialName}` : ""}
              </h2>
              {details.length ? <p className="mt-1 text-sm text-fg-soft">{details.join(" · ")}</p> : null}
              {result.ok && result.found ? <p className="mt-1 text-[11px] text-muted">{result.sourceLabel}</p> : null}
            </>
          ) : (
            <h2 className="mt-0.5 text-lg font-extrabold leading-snug md:text-xl">
              {result.ok && !result.found
                ? "הרכב לא נמצא במאגר"
                : isRetryablePlateFailure(result)
                  ? "החיפוש לא הושלם, נסו שוב"
                  : "לא הצלחנו לבצע את החיפוש"}
            </h2>
          )}
        </div>
        <div className="il-plate il-plate-sm" dir="ltr" title="מספר הרכב שהוזן">
          <div className="il-plate-band" aria-hidden="true">
            <span className="il-plate-flag" />
            <span className="il-plate-il">IL</span>
          </div>
          <span data-plate="display" className="il-plate-input il-plate-readout">
            {formatIlPlate(plate)}
          </span>
        </div>
      </div>

      {mapped && vehicle ? (
        <p className="mt-3 rounded-xl bg-panel px-3 py-2 text-sm">
          הותאם לקטלוג:{" "}
          <strong>
            {vehicle.mapping.make} {vehicle.mapping.model}
            {vehicle.mapping.year ? ` ${vehicle.mapping.year}` : ""}
          </strong>
        </p>
      ) : vehicle ? (
        <div className="mt-3 rounded-xl border border-dashed border-line bg-panel px-3 py-2.5 text-sm">
          <p className="font-bold">לא הצלחנו להתאים את הרכב לקטלוג בוודאות</p>
          <p className="mt-1 text-fg-soft">
            {vehicle.mapping.reason || "בחרו יצרן, דגם ושנה ידנית. לא נציג חלקים לא קשורים."}
          </p>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-line bg-panel px-3 py-2.5 text-sm">
          <p>{"message" in result ? result.message : "בחרו יצרן, דגם ושנה ידנית."}</p>
          {canRetry ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              data-plate="retry"
              className="sq-btn mt-2.5 min-h-11 w-full bg-accent px-4 text-sm font-extrabold text-on-accent hover:bg-accent-hot disabled:opacity-60 sm:w-auto"
            >
              {retrying ? "מנסים שוב…" : "נסו שוב"}
            </button>
          ) : null}
          <p className="mt-2 text-fg-soft">אפשר לבחור יצרן, דגם ושנה ידנית בטופס שמתחת.</p>
        </div>
      )}

      {mapped && tiles.length ? (
        <div className="mt-3">
          <h3 className="mb-2 text-sm font-extrabold">חלקים מתאימים לפי קטגוריה</h3>
          <ul className="grid grid-cols-2 gap-2">
            {tiles.map((tile) => (
              <li key={tile.id}>
                <Link
                  to="/results"
                  search={tile.search}
                  className="flex min-h-14 items-center gap-2.5 rounded-xl border border-line bg-panel p-1.5 pe-3 text-sm hover:border-accent"
                >
                  {/* Only a real catalog photo of a fitting product; never a generic/placeholder image. */}
                  {hasRealProductImage(tile.image) ? (
                    <span
                      data-tile-thumb
                      className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white"
                    >
                      <img
                        src={tile.image}
                        alt=""
                        width={44}
                        height={44}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-contain p-0.5"
                      />
                    </span>
                  ) : null}
                  <span className="flex min-w-0 flex-col">
                    <span className="font-bold leading-tight">{tile.label.replace(/\n/g, " ")}</span>
                    <span className="text-xs text-muted tabular-nums">
                      {tile.count === 1 ? "פריט אחד" : `${tile.count.toLocaleString("he-IL")}`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {onClear ? (
        <div className={cn("mt-3 flex flex-wrap gap-2")}>
          <button type="button" onClick={onClear} className="text-xs text-muted underline">
            נקו את זיהוי הרכב
          </button>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Compact vehicle bar for results pages (after a category / search was chosen):
 * vehicle name, small plate, year and a "שנה חיפוש" toggle. The full card with
 * category buttons stays on the vehicle overview.
 */
export function PlateVehicleBar({
  plate,
  result,
  open,
  onToggle,
}: {
  plate: string;
  result: PlateLookupResult;
  open: boolean;
  onToggle: () => void;
}) {
  const vehicle = result.ok && result.found ? result.vehicle : undefined;
  if (!vehicle) return null;
  return (
    <section
      className="mb-3 rounded-2xl border border-line bg-card p-3 shadow-lift"
      aria-label="הרכב שזוהה לפי מספר רישוי"
      data-vehicle-bar
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold leading-tight">
            {vehicle.manufacturer}
            {vehicle.commercialName ? ` · ${vehicle.commercialName}` : ""}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-block" style={{ zoom: 0.62 }}>
              <span className="il-plate il-plate-sm" dir="ltr" title="מספר הרכב שהוזן">
                <span className="il-plate-band" aria-hidden="true">
                  <span className="il-plate-flag" />
                  <span className="il-plate-il">IL</span>
                </span>
                <span data-plate="display" className="il-plate-input il-plate-readout">
                  {formatIlPlate(plate)}
                </span>
              </span>
            </span>
            {vehicle.year ? <span className="text-xs text-muted">שנת {vehicle.year}</span> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls="change-search"
          data-change-search
          className="sq-btn min-h-11 shrink-0 border border-line bg-panel px-3.5 text-[13px] font-extrabold text-fg"
        >
          {open ? "סגור ▴" : "שנה חיפוש ▾"}
        </button>
      </div>
    </section>
  );
}
