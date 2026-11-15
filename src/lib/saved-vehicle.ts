import { normalizeIlPlate } from "./order-quote.ts";
import { isMappedPlateResult, readPlateSession } from "./plate-session.ts";

const VEHICLE_KEY = "hezi-vehicle-v1";

export type SavedVehicle = { make?: string; model?: string; year?: string; plate?: string };

function normalizeSavedPlate(raw?: string): string | undefined {
  const digits = normalizeIlPlate(raw || "");
  return digits || undefined;
}

export function readSavedVehicle(): SavedVehicle {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VEHICLE_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw) as SavedVehicle;
    return {
      make: v.make || undefined,
      model: v.model || undefined,
      year: v.year ? String(v.year) : undefined,
      plate: normalizeSavedPlate(v.plate),
    };
  } catch {
    return {};
  }
}

export function writeSavedVehicle(v: SavedVehicle) {
  if (typeof window === "undefined") return;
  try {
    const prev = readSavedVehicle();
    const plateOnly = v.plate !== undefined && !v.make && !v.model && !v.year;
    const make = plateOnly ? prev.make : v.make;
    const model = plateOnly ? prev.model : v.model;
    const year = plateOnly ? prev.year : v.year;
    let plate = v.plate;
    if (plate === undefined) {
      const same =
        (prev.make || undefined) === (make || undefined) &&
        (prev.model || undefined) === (model || undefined) &&
        String(prev.year || "") === String(year || "");
      plate = same ? prev.plate : undefined;
    }
    localStorage.setItem(
      VEHICLE_KEY,
      JSON.stringify({
        make: make || undefined,
        model: model || undefined,
        year: year ? String(year) : undefined,
        plate: normalizeSavedPlate(plate),
      }),
    );
  } catch {
    /* ignore quota */
  }
}

export function clearSavedVehicle() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(VEHICLE_KEY);
  } catch {
    /* ignore */
  }
}

/** Prefer the saved vehicle (localStorage), then a still-active plate-search session. */
export function readIdentifiedVehicle(): SavedVehicle {
  const saved = readSavedVehicle();
  const session = typeof window === "undefined" ? null : readPlateSession();
  const sessionPlate = session?.plate ? normalizeSavedPlate(session.plate) : undefined;
  const mapped =
    session && isMappedPlateResult(session.result) && session.result.ok && session.result.found
      ? session.result.vehicle.mapping
      : undefined;
  return {
    plate: saved.plate || sessionPlate,
    make: saved.make || mapped?.make || undefined,
    model: saved.model || mapped?.model || undefined,
    year: saved.year || mapped?.year || undefined,
  };
}
