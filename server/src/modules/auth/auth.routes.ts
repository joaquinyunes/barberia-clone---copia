import { randomUUID } from "node:crypto";
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
import { audit } from "../audit/audit.service.js";
import { matchTotpStep, openSecret, otpauthUrl, newSecret, sealSecret, verifyTotp } from "../../lib/totp.js";
import { clearFailures, isLocked, recordFailure } from "./loginAttempt.model.js";
import { Client, normalizePhone } from "../clients/client.model.js";
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

/** Entrega un refresh token nuevo (cookie) y lo registra como vigente para este dispositivo. */
async function issueRefresh(res: import("express").Response, user: InstanceType<typeof User>) {
  const jti = randomUUID();
  await User.updateOne({ _id: user._id }, { $push: { refreshJtis: { $each: [jti], $slice: -10 } } });
  res.cookie(COOKIE, signRefresh(String(user._id), user.tokenVersion, jti), cookieOpts);
}

function session(user: InstanceType<typeof User>) {
  return {
    accessToken: signAccess({ sub: String(user._id), role: user.role }),
    user: { ...user.toJSON(), permissions: permissionsFor(user.role as Role, user.extraPermissions) },
  };
}

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60_000;
/** Contraseña de personal (todo menos clientes): mínimo 12 caracteres. */
export const STAFF_MIN_PASSWORD = 12;

// Hash de relleno: si la cuenta no existe se compara igual, para que no se note por el tiempo de respuesta.
const DUMMY_HASH = bcrypt.hashSync("relleno-sin-cuenta", 10);
const GENERIC_LOGIN_ERROR = "Email o contraseña incorrectos, o la cuenta está bloqueada unos minutos.";

authRouter.post(
  "/login",
  authLimiter,
  validate({ body: z.object({ email: z.string().email(), password: z.string().min(1), totp: z.string().optional() }) }),
  async (req, res) => {
    const email = String(req.body.email).toLowerCase();
    const ip = req.ip ?? "?";
    const user = await User.findOne({ email }).select("+totpSecret");
    const passwordOk = await bcrypt.compare(req.body.password, user?.passwordHash ?? DUMMY_HASH);
    // Un solo mensaje para: no existe, contraseña mala, cuenta inactiva o bloqueada (no se revela cuál).
    const fail = async () => {
      // El bloqueo es por cuenta + IP (con espera creciente): quien ataca desde una IP no deja afuera al dueño que entra desde otra.
      if (await recordFailure(email, ip)) await audit(undefined, { action: "custom", entity: "Seguridad", summary: "se bloqueó un par cuenta+IP por intentos fallidos de ingreso" });
      throw AppError.unauthorized(GENERIC_LOGIN_ERROR);
    };
    if (await isLocked(email, ip)) throw AppError.unauthorized(GENERIC_LOGIN_ERROR);
    if (!user || !passwordOk || !user.active) return fail();
    if (user.totpEnabled) {
      if (!req.body.totp) throw new AppError(401, "Ingresá el código de tu app de autenticación", "TOTP_REQUIRED");
      const step = matchTotpStep(openSecret(user.totpSecret!), req.body.totp);
      if (step === null) return fail();
      // Un código se acepta una sola vez: se guarda el último paso usado (atómico).
      const fresh = await User.findOneAndUpdate({ _id: user._id, $or: [{ totpLastStep: { $exists: false } }, { totpLastStep: { $lt: step } }] }, { totpLastStep: step });
      if (!fresh) return fail();
    }
    await clearFailures(email, ip);
    const entered = await User.findOneAndUpdate({ _id: user._id }, { $set: { lastLoginAt: new Date() } }, { new: true });
    if (!entered) throw AppError.unauthorized(GENERIC_LOGIN_ERROR);
    await issueRefresh(res, entered);
    res.json(session(entered));
  },
);

/**
 * 2FA (TOTP) para el personal: 1) con la contraseña actual pide un secreto NUEVO (queda pendiente, el 2FA vigente no se toca),
 * 2) confirma con un código y recién ahí queda activo. Si ya hay 2FA activo hay que desactivarlo primero (contraseña + código).
 */
authRouter.post("/2fa/setup", authLimiter, authenticate, validate({ body: z.object({ password: z.string().min(1) }) }), async (req, res) => {
  if (req.user!.role === "customer") throw AppError.forbidden();
  const user = await User.findById(req.user!._id);
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) throw AppError.badRequest("La contraseña no es correcta");
  if (user.totpEnabled) throw AppError.conflict("La verificación en dos pasos ya está activa. Desactivala primero para cambiarla.");
  const secret = newSecret();
  await User.updateOne({ _id: user._id }, { totpPending: sealSecret(secret) });
  res.json({ secret, otpauthUrl: otpauthUrl(secret, user.email) });
});

authRouter.post("/2fa/enable", authLimiter, authenticate, validate({ body: z.object({ code: z.string().length(6) }) }), async (req, res) => {
  const user = await User.findById(req.user!._id).select("+totpPending");
  if (!user?.totpPending || user.totpEnabled || !verifyTotp(openSecret(user.totpPending), req.body.code)) throw AppError.badRequest("Código incorrecto");
  const step = matchTotpStep(openSecret(user.totpPending), req.body.code);
  user.totpSecret = user.totpPending;
  user.totpPending = undefined;
  user.totpEnabled = true;
  user.totpLastStep = step ?? undefined; // el código con el que se activó no se puede reusar para entrar
  user.tokenVersion += 1; // cierra las demás sesiones
  await user.save();
  await audit(req, { action: "update", entity: "Seguridad", entityId: user._id, summary: "activó la verificación en dos pasos" });
  res.status(204).end();
});

authRouter.post("/2fa/disable", authLimiter, authenticate, validate({ body: z.object({ password: z.string(), code: z.string().length(6) }) }), async (req, res) => {
  const user = await User.findById(req.user!._id).select("+totpSecret");
  if (!user?.totpEnabled || !(await bcrypt.compare(req.body.password, user.passwordHash)) || !verifyTotp(openSecret(user.totpSecret!), req.body.code)) {
    throw AppError.badRequest("Contraseña o código incorrectos");
  }
  user.totpEnabled = false;
  user.totpSecret = undefined;
  await user.save();
  await audit(req, { action: "update", entity: "Seguridad", entityId: user._id, summary: "desactivó la verificación en dos pasos" });
  res.status(204).end();
});

authRouter.post(
  "/register",
  authLimiter,
  validate({ body: z.object({ name: z.string().trim().min(2), email: z.string().email(), phone: z.string().min(8), password: z.string().min(8, "Mínimo 8 caracteres") }) }),
  async (req, res) => {
    const email = req.body.email.toLowerCase();
    const phone = normalizePhone(req.body.phone);
    // Mismo mensaje si el email o el celular ya tienen cuenta: no sirve para averiguar quién es cliente.
    const taken = AppError.conflict("No pudimos crear la cuenta con esos datos. Si ya te registraste, ingresá con tu email.");
    if (await User.exists({ email })) throw taken;
    if (await Client.exists({ phone, user: { $exists: true } })) throw taken;
    // La cuenta nace SIN ficha: una ficha existente trae turnos, saldo y gift cards, y no se entrega por escribir el celular
    // (ni siquiera con el mismo email). Se vincula con un código que llega al celular (/me/client/claim/*) o lo vincula el personal.
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      passwordHash: await bcrypt.hash(req.body.password, 10),
      role: "customer",
    });
    await issueRefresh(res, user);
    res.status(201).json({ ...session(user), pendingClaim: true });
  },
);

authRouter.post("/refresh", async (req, res) => {
  const token = req.cookies?.[COOKIE];
  if (!token) throw AppError.unauthorized("Sesión expirada");
  let payload: { sub: string; v: number; jti?: string };
  try {
    payload = verifyRefresh(token);
  } catch {
    throw AppError.unauthorized("Sesión expirada");
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.active || user.tokenVersion !== payload.v || !payload.jti) throw AppError.unauthorized("Sesión expirada");
  // Rotación: el token usado se "gasta" de forma atómica. Si ya no estaba vigente, alguien lo reusó (robo probable): se cierran
  // TODAS las sesiones de la cuenta (también la que tenga el token nuevo) y queda registrado.
  const spent = await User.findOneAndUpdate({ _id: user._id, refreshJtis: payload.jti }, { $pull: { refreshJtis: payload.jti } });
  if (!spent) {
    await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 }, $set: { refreshJtis: [] } });
    await audit(undefined, { action: "custom", entity: "Seguridad", entityId: user._id, summary: "se reutilizó un refresh token ya rotado: se cerraron todas las sesiones de la cuenta" });
    res.clearCookie(COOKIE, { ...cookieOpts, maxAge: undefined });
    throw AppError.unauthorized("Sesión expirada");
  }
  await issueRefresh(res, user);
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
  authLimiter,
  authenticate,
  validate({ body: z.object({ current: z.string(), next: z.string().min(8) }) }),
  async (req, res) => {
    if (req.user!.role !== "customer" && req.body.next.length < STAFF_MIN_PASSWORD) throw AppError.badRequest(`Para el personal la contraseña debe tener al menos ${STAFF_MIN_PASSWORD} caracteres`);
    const user = await User.findById(req.user!._id);
    if (!user || !(await bcrypt.compare(req.body.current, user.passwordHash))) throw AppError.badRequest("La contraseña actual no es correcta");
    user.passwordHash = await bcrypt.hash(req.body.next, 10);
    user.tokenVersion += 1;
    await user.save();
    res.status(204).end();
  },
);
