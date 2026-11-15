import type { PlateLookupResult } from "./mot-plate-lookup";

const KEY = "hezi-orkor-plate-vehicle-v1";

export type StoredPlateVehicle = {
  /** Client-only, used to show the yellow plate. Never sent back to logs. */
  plate: string;
  result: PlateLookupResult;
  at: number;
};

export function readPlateSession(): StoredPlateVehicle | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPlateVehicle;
    if (!parsed?.result || !parsed.plate) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePlateSession(entry: StoredPlateVehicle) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    /* ignore quota */
  }
}

export function clearPlateSession() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function isMappedPlateResult(result: PlateLookupResult) {
  return Boolean(result.ok && result.found && result.vehicle.mapping.confidence === "mapped" && result.vehicle.mapping.make && result.vehicle.mapping.model);
}
