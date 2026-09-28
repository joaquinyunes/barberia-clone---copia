import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  kind: "product" | "pack";
  id: string;
  name: string;
  price: number;
  image?: string;
  qty: number;
}

interface CartState {
  items: CartItem[];
  open: boolean;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.id === item.id);
          const items = existing
            ? s.items.map((i) => (i.id === item.id ? { ...i, qty: Math.min(20, i.qty + qty) } : i))
            : [...s.items, { ...item, qty }];
          return { items, open: true };
        }),
      setQty: (id, qty) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(20, qty)) } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ open }),
    }),
    { name: "jeb-cart", partialize: (s) => ({ items: s.items }) },
  ),
);

export const cartTotal = (items: CartItem[]) => items.reduce((a, i) => a + i.price * i.qty, 0);
export const cartCount = (items: CartItem[]) => items.reduce((a, i) => a + i.qty, 0);
