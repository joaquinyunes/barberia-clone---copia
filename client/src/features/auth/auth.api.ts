import { http } from "@/services/http";
import type { SessionUser } from "./authStore";

interface Session {
  accessToken: string;
  user: SessionUser;
}

export const authApi = {
  login: (email: string, password: string) => http.post<Session>("/auth/login", { email, password }).then((r) => r.data),
  register: (data: { name: string; email: string; phone: string; password: string }) => http.post<Session>("/auth/register", data).then((r) => r.data),
  logout: () => http.post("/auth/logout"),
};
