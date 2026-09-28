import { useState } from "react";

/** Preferencias del visitante (cookies aceptadas, etc.). Tolera navegación privada. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* almacenamiento no disponible */
    }
  };
  return [value, set] as const;
}
