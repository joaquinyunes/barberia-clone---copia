import { useEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui";
import { sessionHint, useAuthStore } from "@/features/auth/authStore";
import { refreshSession } from "@/services/http";
import { queryClient } from "./queryClient";

/** Restaura la sesión con la cookie de refresh al cargar la app. */
function SessionBootstrap() {
  const setReady = useAuthStore((s) => s.setReady);
  useEffect(() => {
    if (sessionHint.get()) refreshSession().finally(setReady);
    else setReady();
  }, [setReady]);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <SessionBootstrap />
        {children}
        <Toaster />
      </MotionConfig>
    </QueryClientProvider>
  );
}
