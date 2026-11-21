import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/AppError.js";
import type { Permission } from "../core/permissions.js";

/** Permite el paso si el usuario tiene AL MENOS uno de los permisos indicados. */
export const authorize =
  (...required: Permission[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (req.user.role === "admin") return next();
    if (required.some((p) => req.user!.permissions.includes(p))) return next();
    next(AppError.forbidden());
  };

export const hasPermission = (req: Request, p: Permission) =>
  req.user?.role === "admin" || !!req.user?.permissions.includes(p);

/** Sedes a las que está limitado el usuario (null = todas: administradores y usuarios sin sedes asignadas). */
export const locationsOf = (req: Request): string[] | null => {
  if (!req.user || req.user.role === "admin" || !req.user.locations?.length) return null;
  return req.user.locations.map(String);
};

/** 403 si el usuario está limitado a otras sedes. */
export function assertLocation(req: Request, location: unknown) {
  const allowed = locationsOf(req);
  if (allowed && !allowed.includes(String(location))) throw AppError.forbidden("Esa sede no está asignada a tu usuario");
}

/** Filtro de sede para listados: respeta el límite del usuario y un filtro pedido (que no puede salirse del límite). */
export function locationFilter(req: Request, requested?: string): unknown {
  const allowed = locationsOf(req);
  if (!allowed) return requested || undefined;
  if (requested) return allowed.includes(requested) ? requested : { $in: [] };
  return { $in: allowed };
}
