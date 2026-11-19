import { createHash } from "node:crypto";
import { Schema, model } from "mongoose";

/**
 * Intentos fallidos por PAR cuenta + IP (no por cuenta sola: así quien conoce el email del dueño no puede dejarlo afuera
 * desde otra IP). Cada bloqueo repetido dura el doble (15, 30, 60 min… hasta 4 h); el registro se borra solo a las 24 h sin actividad.
 */
const attemptSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    failures: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    lockUntil: Date,
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
);

export const LoginAttempt = model("LoginAttempt", attemptSchema);

export const attemptKey = (email: string, ip: string) => createHash("sha256").update(`${email.toLowerCase()}|${ip}`).digest("hex");
const MAX_FAILED = 5;
const BASE_LOCK_MS = 15 * 60_000;
const MAX_LOCK_MS = 4 * 60 * 60_000;

/** ¿Está bloqueado este par ahora? */
export async function isLocked(email: string, ip: string) {
  const a = await LoginAttempt.findOne({ key: attemptKey(email, ip) }, "lockUntil").lean();
  return !!a?.lockUntil && a.lockUntil > new Date();
}

/** Suma un fallo (atómico) y bloquea al llegar a 5, con espera creciente. Devuelve true si quedó bloqueado. */
export async function recordFailure(email: string, ip: string) {
  const key = attemptKey(email, ip);
  const a = await LoginAttempt.findOneAndUpdate(
    { key },
    { $inc: { failures: 1 }, $set: { email: email.toLowerCase(), expiresAt: new Date(Date.now() + 24 * 3_600_000) } },
    { upsert: true, new: true },
  );
  if (a.failures < MAX_FAILED) return false;
  const lock = Math.min(BASE_LOCK_MS * 2 ** a.level, MAX_LOCK_MS);
  await LoginAttempt.updateOne({ key, failures: { $gte: MAX_FAILED } }, { $set: { failures: 0, lockUntil: new Date(Date.now() + lock) }, $inc: { level: 1 } });
  return true;
}

export const clearFailures = (email: string, ip: string) => LoginAttempt.deleteOne({ key: attemptKey(email, ip) });
