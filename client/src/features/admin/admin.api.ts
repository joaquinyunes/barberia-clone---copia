import { http } from "@/services/http";
import type { Paged } from "@/types";

/** Acceso genérico a los recursos del panel (/admin/<recurso>). */
export const adminApi = {
  list: <T>(resource: string, params?: Record<string, unknown>) => http.get<Paged<T>>(`/admin/${resource}`, { params }).then((r) => r.data),
  get: <T>(path: string, params?: Record<string, unknown>) => http.get<T>(`/admin/${path}`, { params }).then((r) => r.data),
  create: <T>(resource: string, data: unknown) => http.post<T>(`/admin/${resource}`, data).then((r) => r.data),
  update: <T>(resource: string, id: string, data: unknown) => http.patch<T>(`/admin/${resource}/${id}`, data).then((r) => r.data),
  remove: (resource: string, id: string) => http.delete(`/admin/${resource}/${id}`),
  post: <T>(path: string, data?: unknown) => http.post<T>(`/admin/${path}`, data ?? {}).then((r) => r.data),
  patch: <T>(path: string, data?: unknown) => http.patch<T>(`/admin/${path}`, data ?? {}).then((r) => r.data),
};
