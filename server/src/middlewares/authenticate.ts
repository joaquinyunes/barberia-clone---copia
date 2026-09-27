import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/AppError.js";
import { verifyAccess } from "../lib/tokens.js";
import { User, type UserDoc } from "../modules/users/user.model.js";
import { permissionsFor, type Permission } from "../core/permissions.js";

declare global {
  namespace Express {
    interface Request {
      user?: UserDoc & { permissions: Permission[] };
    }
  }
}

async function loadUser(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = verifyAccess(header.slice(7));
    const user = await User.findById(payload.sub);
    if (!user || !user.active) return null;
    return Object.assign(user, {
      permissions: permissionsFor(user.role, user.extraPermissions),
    });
  } catch {
    return null;
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const user = await loadUser(req);
  if (!user) return next(AppError.unauthorized());
  req.user = user;
  next();
}

/** Igual que authenticate pero no falla si no hay sesión (reservas como invitado). */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const user = await loadUser(req);
  if (user) req.user = user;
  next();
}
