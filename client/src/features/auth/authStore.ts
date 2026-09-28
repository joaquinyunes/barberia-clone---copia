import { create } from "zustand";

export type Role = "admin" | "manager" | "reception" | "barber" | "customer";

export interface SessionUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  barber?: string;
  client?: string;
}

interface AuthState {
  accessToken: string | null;
  user: SessionUser | null;
  ready: boolean; // ya se intentó restaurar la sesión
  setSession: (token: string, user: SessionUser) => void;
  clear: () => void;
  setReady: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  ready: false,
  setSession: (accessToken, user) => set({ accessToken, user, ready: true }),
  clear: () => set({ accessToken: null, user: null, ready: true }),
  setReady: () => set({ ready: true }),
}));

export const can = (user: SessionUser | null, ...perms: string[]) =>
  !!user && (user.role === "admin" || perms.some((p) => user.permissions.includes(p)));
