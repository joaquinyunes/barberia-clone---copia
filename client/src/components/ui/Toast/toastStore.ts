import { create } from "zustand";

export interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

interface ToastState {
  items: ToastItem[];
  push: (message: string, tone?: ToastItem["tone"]) => void;
  dismiss: (id: number) => void;
}

let seq = 0;
export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (message, tone = "success") => {
    const id = ++seq;
    set((s) => ({ items: [...s.items, { id, message, tone }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 4500);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (m: string) => useToastStore.getState().push(m, "success"),
  error: (m: string) => useToastStore.getState().push(m, "error"),
  info: (m: string) => useToastStore.getState().push(m, "info"),
};
