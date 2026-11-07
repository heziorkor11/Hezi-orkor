import { create } from "zustand";
import { persist } from "zustand/middleware";
import { emptyOrderCustomer, type OrderCustomer } from "@/lib/order-quote";

const VEHICLE_KEY = "hezi-vehicle-v1";

export type SavedVehicle = { make?: string; model?: string; year?: string };

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
    };
  } catch {
    return {};
  }
}

export function writeSavedVehicle(v: SavedVehicle) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      VEHICLE_KEY,
      JSON.stringify({
        make: v.make || undefined,
        model: v.model || undefined,
        year: v.year ? String(v.year) : undefined,
      }),
    );
  } catch {
    /* ignore quota */
  }
}

type OrderFormState = OrderCustomer & {
  setField: <K extends keyof OrderCustomer>(key: K, value: OrderCustomer[K]) => void;
  setMany: (patch: Partial<OrderCustomer>) => void;
  prefillVehicleFromSaved: () => void;
  resetCustomerKeepVehicle: () => void;
};

export const useOrderForm = create<OrderFormState>()(
  persist(
    (set, get) => ({
      ...emptyOrderCustomer(),
      setField: (key, value) => set({ [key]: value } as Partial<OrderFormState>),
      setMany: (patch) => set(patch),
      prefillVehicleFromSaved: () => {
        const v = readSavedVehicle();
        const cur = get();
        set({
          make: cur.make || v.make || "",
          model: cur.model || v.model || "",
          year: cur.year || v.year || "",
        });
      },
      resetCustomerKeepVehicle: () => {
        const { make, model, year, engine } = get();
        set({ ...emptyOrderCustomer(), make, model, year, engine });
      },
    }),
    {
      name: "hezi-order-form-v1",
      partialize: (s) => ({
        name: s.name,
        phone: s.phone,
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
