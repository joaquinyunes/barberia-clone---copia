import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "./auth.api";
import { can, useAuthStore } from "./authStore";

export function useAuth() {
  const { user, ready, setSession, clear } = useAuthStore();
  const navigate = useNavigate();

  const login = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authApi.login(email, password),
    onSuccess: (s) => setSession(s.accessToken, s.user),
  });
  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: (s) => setSession(s.accessToken, s.user),
  });
  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    clear();
    navigate("/");
  };
  return { user, ready, login, register, logout, can: (...p: string[]) => can(user, ...p), isStaff: !!user && user.role !== "customer" };
}
