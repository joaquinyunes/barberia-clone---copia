import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/features/auth/authStore";

export const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

/** Instancia única de Axios. El access token vive en memoria; el refresh en cookie httpOnly. */
export const http = axios.create({ baseURL: API_URL, withCredentials: true });

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

export async function refreshSession() {
  refreshing ??= axios
    .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
    .then((r) => {
      useAuthStore.getState().setSession(r.data.accessToken, r.data.user);
      return r.data.accessToken as string;
    })
    .catch(() => {
      useAuthStore.getState().clear();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthCall = original?.url?.includes("/auth/");
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      const token = await refreshSession();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      }
    }
    return Promise.reject(error);
  },
);

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

/** Mensaje legible en español a partir de cualquier error de la API. */
export function errorMessage(err: unknown, fallback = "Ocurrió un error. Intentá de nuevo.") {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    if (!err.response) return "No hay conexión con el servidor.";
    const details = err.response.data?.error?.details;
    if (details && typeof details === "object") {
      const first = Object.values(details as Record<string, unknown>).flat()[0];
      if (typeof first === "string") return `${err.response.data?.error?.message ?? "Datos inválidos"}: ${first}`;
    }
    return err.response.data?.error?.message ?? fallback;
  }
  return fallback;
}

export const errorCode = (err: unknown) => (axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data?.error?.code : undefined);
