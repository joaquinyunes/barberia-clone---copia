import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Sede con la que está trabajando el usuario del panel (caja, turnos del día). */
export const useAdminStore = create<{ location: string; setLocation: (id: string) => void }>()(
  persist((set) => ({ location: "", setLocation: (location) => set({ location }) }), { name: "jeb-admin" }),
);
