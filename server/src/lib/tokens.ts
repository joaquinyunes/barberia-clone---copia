import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AccessPayload {
  sub: string;
  role: string;
}

export const signAccess = (p: AccessPayload) =>
  jwt.sign(p, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
export const verifyAccess = (t: string) => jwt.verify(t, env.JWT_ACCESS_SECRET) as AccessPayload;

export const signRefresh = (sub: string, version: number) =>
  jwt.sign({ sub, v: version }, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
export const verifyRefresh = (t: string) =>
  jwt.verify(t, env.JWT_REFRESH_SECRET) as { sub: string; v: number };

/** Links firmados (comprobantes, gestión de una reserva sin cuenta). */
export const signLink = (data: Record<string, string>, expiresIn: jwt.SignOptions["expiresIn"] = "7d") =>
  jwt.sign(data, env.LINK_SECRET, { expiresIn });
export const verifyLink = <T>(t: string) => jwt.verify(t, env.LINK_SECRET) as T;
