import { create } from "zustand";

type MenuState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const useSiteMenu = create<MenuState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
