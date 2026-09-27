import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 20_000, retry: (count, err) => count < 2 && (err as { response?: { status?: number } }).response?.status !== 404, refetchOnWindowFocus: false },
  },
});
