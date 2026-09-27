import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../../config/env.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authLimiter } from "../../middlewares/rateLimiters.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../lib/AppError.js";
import { signAccess, signRefresh, verifyRefresh } from "../../lib/tokens.js";
import { permissionsFor, type Role } from "../../core/permissions.js";
import { findOrCreate } from "../clients/client.service.js";
import { User } from "../users/user.model.js";

export const authRouter = Router();

const COOKIE = "jeb_refresh";
const cookieOpts = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 3600 * 1000,
};

function session(user: InstanceType<typeof User>) {
  return {
    accessToken: signAccess({ sub: String(user._id), role: user.role }),
    user: { ...user.toJSON(), permissions: permissionsFor(user.role as Role, user.extraPermissions) },
  };
}

authRouter.post("/login", authLimiter, validate({ body: z.object({ email: z.string().email(), password: z.string().min(1) }) }), async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (!user || !user.active || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    throw AppError.unauthorized("Email o contraseña incorrectos");
  }
  user.lastLoginAt = new Date();
  await user.save();
  res.cookie(COOKIE, signRefresh(String(user._id), user.tokenVersion), cookieOpts);
  res.json(session(user));
});

authRouter.post(
  "/register",
  authLimiter,
  validate({ body: z.object({ name: z.string().trim().min(2), email: z.string().email(), phone: z.string().min(8), password: z.string().min(8, "Mínimo 8 caracteres") }) }),
  async (req, res) => {
    if (await User.exists({ email: req.body.email.toLowerCase() })) throw AppError.conflict("Ya existe una cuenta con ese email");
    const { client } = await findOrCreate({ name: req.body.name, phone: req.body.phone, email: req.body.email });
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      passwordHash: await bcrypt.hash(req.body.password, 10),
      role: "customer",
      client: client._id,
    });
    client.user = user._id;
    await client.save();
    res.cookie(COOKIE, signRefresh(String(user._id), user.tokenVersion), cookieOpts);
    res.status(201).json(session(user));
  },
);

authRouter.post("/refresh", async (req, res) => {
  const token = req.cookies?.[COOKIE];
  if (!token) throw AppError.unauthorized("Sesión expirada");
  let payload: { sub: string; v: number };
  try {
    payload = verifyRefresh(token);
  } catch {
    throw AppError.unauthorized("Sesión expirada");
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.active || user.tokenVersion !== payload.v) throw AppError.unauthorized("Sesión expirada");
  res.json(session(user));
});

authRouter.post("/logout", async (req, res) => {
  res.clearCookie(COOKIE, { ...cookieOpts, maxAge: undefined });
  res.status(204).end();
});

/** Cierra la sesión en todos los dispositivos (invalida los refresh tokens). */
authRouter.post("/logout-all", authenticate, async (req, res) => {
  await User.updateOne({ _id: req.user!._id }, { $inc: { tokenVersion: 1 } });
  res.clearCookie(COOKIE, { ...cookieOpts, maxAge: undefined });
  res.status(204).end();
});

authRouter.get("/me", authenticate, async (req, res) => {
  res.json({ ...req.user!.toJSON(), permissions: req.user!.permissions });
});

authRouter.post(
  "/change-password",
  authenticate,
  validate({ body: z.object({ current: z.string(), next: z.string().min(8) }) }),
  async (req, res) => {
    const user = await User.findById(req.user!._id);
    if (!user || !(await bcrypt.compare(req.body.current, user.passwordHash))) throw AppError.badRequest("La contraseña actual no es correcta");
    user.passwordHash = await bcrypt.hash(req.body.next, 10);
    user.tokenVersion += 1;
    await user.save();
    res.status(204).end();
  },
);
