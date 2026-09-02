import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = { id: string; qty: number };

type CartState = {
  items: CartItem[];
  add: (id: string, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (id, qty = 1) => {
        const items = get().items.map((x) => ({ ...x }));
        const found = items.find((x) => x.id === id);
        if (found) found.qty += qty;
        else items.push({ id, qty });
        set({ items });
      },
      remove: (id) => set({ items: get().items.filter((x) => x.id !== id) }),
      setQty: (id, qty) => {
        if (qty < 1) {
          set({ items: get().items.filter((x) => x.id !== id) });
          return;
        }
        set({
          items: get().items.map((x) => (x.id === id ? { ...x, qty } : x)),
        });
      },
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((s, x) => s + x.qty, 0),
    }),
    { name: "hezi-cart-v3" },
  ),
);
