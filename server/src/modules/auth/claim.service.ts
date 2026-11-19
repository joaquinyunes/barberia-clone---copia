import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { Schema, model } from "mongoose";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { notify } from "../../lib/notify/notifier.js";
import { Client, normalizePhone } from "../clients/client.model.js";
import { findOrCreate } from "../clients/client.service.js";
import { User } from "../users/user.model.js";

/**
 * Vincular una cuenta a una ficha de cliente exige probar que el celular es tuyo: se manda un código de 6 dígitos
 * AL CELULAR DE LA FICHA (no al que escribió quien se registró). Vence a los 10 minutos, tiene 5 intentos y se usa una sola vez.
 */
const claimSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    phone: { type: String, required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
);
const ClaimCode = model("ClaimCode", claimSchema);

const hash = (code: string, userId: unknown) => createHmac("sha256", env.LINK_SECRET).update(`claim:${userId}:${code}`).digest("hex");
const MAX_ATTEMPTS = 5;

export async function requestClaim(userId: string) {
  const user = await User.findById(userId);
  if (!user || user.role !== "customer" || user.client) throw AppError.conflict("Tu cuenta ya está vinculada");
  if (!user.phone) throw AppError.badRequest("Tu cuenta no tiene celular");
  const phone = normalizePhone(user.phone);
  const existing = await ClaimCode.findOne({ user: user._id });
  // Un código nuevo por minuto como máximo (evita usar esto para mandar mensajes a un celular ajeno).
  if (existing && Date.now() - (existing as unknown as { updatedAt: Date }).updatedAt.getTime() < 60_000) throw new AppError(429, "Esperá un minuto antes de pedir otro código", "CLAIM_RATE");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await ClaimCode.findOneAndUpdate({ user: user._id }, { phone, codeHash: hash(code, user._id), attempts: 0, expiresAt: new Date(Date.now() + 10 * 60_000) }, { upsert: true });
  await notify({ to: phone, kind: "claim_code", text: `Tu código para vincular tu cuenta es ${code}. Vence en 10 minutos. Si no lo pediste, ignorá este mensaje.` });
}

export async function confirmClaim(userId: string, code: string) {
  const user = await User.findById(userId);
  if (!user || user.role !== "customer") throw AppError.forbidden();
  if (user.client) throw AppError.conflict("Tu cuenta ya está vinculada");
  // Cuenta un intento ANTES de comparar (atómico): los pedidos en paralelo no multiplican las oportunidades.
  const claim = await ClaimCode.findOneAndUpdate({ user: user._id, attempts: { $lt: MAX_ATTEMPTS }, expiresAt: { $gt: new Date() } }, { $inc: { attempts: 1 } }, { new: true });
  const bad = AppError.badRequest("Código incorrecto o vencido. Pedí uno nuevo.");
  if (!claim) throw bad;
  const a = Buffer.from(hash(code, user._id));
  const b = Buffer.from(claim.codeHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw bad;
  await ClaimCode.deleteOne({ _id: claim._id }); // un solo uso
  const { client } = await findOrCreate({ name: user.name, phone: claim.phone, email: user.email });
  // Atómico: la ficha se entrega solo si nadie la reclamó antes.
  const linked = await Client.findOneAndUpdate({ _id: client._id, user: { $exists: false } }, { user: user._id }, { new: true });
  if (!linked) throw AppError.conflict("Ese celular ya tiene una cuenta vinculada. Escribinos si es tuyo.");
  await User.updateOne({ _id: user._id }, { client: linked._id });
}

/** Vinculación manual por el personal, tras verificar la identidad en persona. */
export async function linkByStaff(clientId: string, userId: string) {
  const user = await User.findById(userId);
  if (!user || user.role !== "customer") throw AppError.badRequest("Esa cuenta no es de un cliente");
  if (user.client) throw AppError.conflict("Esa cuenta ya está vinculada");
  const linked = await Client.findOneAndUpdate({ _id: clientId, user: { $exists: false } }, { user: user._id }, { new: true });
  if (!linked) throw AppError.conflict("La ficha no existe o ya tiene una cuenta");
  await User.updateOne({ _id: user._id }, { client: linked._id });
  return linked;
}
