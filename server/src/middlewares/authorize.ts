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
