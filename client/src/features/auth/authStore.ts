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

/**
 * Marca (sin datos sensibles) de que hubo una sesión en este navegador: evita pedir
 * /auth/refresh —y el 401 en consola— en cada visita de alguien que nunca ingresó.
 */
const HINT = "jeb_has_session";
export const sessionHint = {
  get: () => {
    try {
      return localStorage.getItem(HINT) === "1";
    } catch {
      return true; // sin storage, se intenta igual
    }
  },
  set: (on: boolean) => {
    try {
      if (on) localStorage.setItem(HINT, "1");
      else localStorage.removeItem(HINT);
    } catch {
      /* storage bloqueado: no pasa nada */
    }
  },
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  ready: false,
  setSession: (accessToken, user) => {
    sessionHint.set(true);
    set({ accessToken, user, ready: true });
  },
  clear: () => {
    sessionHint.set(false);
    set({ accessToken: null, user: null, ready: true });
  },
  setReady: () => set({ ready: true }),
}));

export const can = (user: SessionUser | null, ...perms: string[]) =>
  !!user && (user.role === "admin" || perms.some((p) => user.permissions.includes(p)));
