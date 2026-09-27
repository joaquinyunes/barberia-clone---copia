import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { PageLoader } from "@/components/ui";
import { can, useAuthStore } from "@/features/auth/authStore";
import { paths } from "./paths";

/** Exige sesión (y opcionalmente staff / permisos). */
export function ProtectedRoute({ children, staff, perms }: { children: ReactNode; staff?: boolean; perms?: string[] }) {
  const { user, ready } = useAuthStore();
  const location = useLocation();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to={paths.login} state={{ from: location.pathname + location.search }} replace />;
  if (staff && user.role === "customer") return <Navigate to={paths.account} replace />;
  if (perms && !can(user, ...perms)) {
    return <div style={{ padding: "3rem", textAlign: "center" }}>No tenés permiso para ver esta sección.</div>;
  }
  return <>{children}</>;
}
