import { create } from "zustand";
import { persist } from "zustand/middleware";
import { emptyOrderCustomer, type OrderCustomer } from "./order-quote.ts";
import { clearPlateSession } from "./plate-session.ts";
import {
  clearSavedVehicle,
  readIdentifiedVehicle,
  readSavedVehicle,
  writeSavedVehicle,
} from "./saved-vehicle.ts";

export type { SavedVehicle } from "./saved-vehicle.ts";
export { clearSavedVehicle, readIdentifiedVehicle, readSavedVehicle, writeSavedVehicle };

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
