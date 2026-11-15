import { create } from "zustand";
import { persist } from "zustand/middleware";
import { emptyOrderCustomer, normalizeIlPlate, type OrderCustomer } from "./order-quote.ts";
import { clearPlateSession, isMappedPlateResult, readPlateSession } from "./plate-session.ts";

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

export function clearIdentifiedVehicle() {
  clearSavedVehicle();
  clearPlateSession();
  useOrderForm.getState().setMany({ plate: "", make: "", model: "", year: "", engine: "" });
}

type OrderFormState = OrderCustomer & {
  setField: <K extends keyof OrderCustomer>(key: K, value: OrderCustomer[K]) => void;
  setMany: (patch: Partial<OrderCustomer>) => void;
  prefillVehicleFromSaved: () => void;
  resetCustomerKeepVehicle: () => void;
  clearIdentifiedVehicle: () => void;
};

export const useOrderForm = create<OrderFormState>()(
  persist(
    (set, get) => ({
      ...emptyOrderCustomer(),
      setField: (key, value) => set({ [key]: value } as Partial<OrderFormState>),
      setMany: (patch) => set(patch),
      prefillVehicleFromSaved: () => {
        const v = readIdentifiedVehicle();
        const cur = get();
        set({
          plate: cur.plate || v.plate || "",
          make: cur.make || v.make || "",
          model: cur.model || v.model || "",
          year: cur.year || v.year || "",
        });
      },
      resetCustomerKeepVehicle: () => {
        const { plate, make, model, year, engine } = get();
        set({ ...emptyOrderCustomer(), plate, make, model, year, engine });
      },
      clearIdentifiedVehicle: () => {
        clearIdentifiedVehicle();
      },
    }),
    {
      name: "hezi-order-form-v1",
      partialize: (s) => ({
        name: s.name,
        phone: s.phone,
        email: s.email,
        city: s.city,
        delivery: s.delivery,
        plate: s.plate,
        make: s.make,
        model: s.model,
        year: s.year,
        engine: s.engine,
        notes: s.notes,
      }),
    },
  ),
);
