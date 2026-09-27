import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "@/components/ui";
import { errorMessage } from "@/services/http";
import { adminApi } from "../admin.api";

/** GET a cualquier endpoint del panel, con cache por ruta + parámetros. */
export function useAdminQuery<T>(path: string, params?: Record<string, unknown>, opts?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: ["admin", path, params],
    queryFn: () => adminApi.get<T>(path, params),
    enabled: opts?.enabled ?? true,
    refetchInterval: opts?.refetchInterval,
  });
}

/** POST/PATCH/DELETE que invalida el cache del panel y muestra un aviso. */
export function useAdminAction<TVars, TRes = unknown>(fn: (v: TVars) => Promise<TRes>, opts?: { success?: string | ((r: TRes) => string); invalidate?: QueryKey; onSuccess?: (r: TRes) => void; silentError?: boolean }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: opts?.invalidate ?? ["admin"] });
      if (opts?.success) toast.success(typeof opts.success === "function" ? opts.success(r) : opts.success);
      opts?.onSuccess?.(r);
    },
    onError: (e) => !opts?.silentError && toast.error(errorMessage(e)),
  });
}
