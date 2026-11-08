import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, Payment, PreApproval, Preference } from "mercadopago";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { Appointment } from "../appointments/appointment.model.js";
import { approveDeposit } from "../appointments/appointment.service.js";
import { Order } from "../orders/order.model.js";
import { approveOrder } from "../orders/order.service.js";
import { audit } from "../audit/audit.service.js";
import { PaymentEvent } from "./paymentEvent.model.js";
import * as cash from "../cash/cash.service.js";
import * as ledger from "../ledger/ledger.service.js";
import { Client } from "../clients/client.model.js";
import { Membership, MembershipPlan } from "../commercial/commercial.models.js";
import * as commercial from "../commercial/commercial.service.js";
import { Location } from "../locations/location.model.js";
import { User } from "../users/user.model.js";
import { Types } from "mongoose";

/**
 * Etapa 2 — Mercado Pago Checkout Pro.
 * Queda listo para activarse cargando MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET.
 */
const client = () => {
  if (!env.MP_ACCESS_TOKEN) throw new AppError(503, "Mercado Pago todavía no está configurado", "MP_DISABLED");
  return new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN });
};

export const mpEnabled = () => !!env.MP_ACCESS_TOKEN;

export async function createPreference(kind: "appointment" | "order", code: string) {
  const doc = kind === "appointment" ? await Appointment.findOne({ code }) : await Order.findOne({ code });
  if (!doc) throw AppError.notFound(kind === "appointment" ? "Turno" : "Pedido");
  if (!["pending_payment", "payment_review"].includes((doc as any).status)) throw AppError.conflict("Este pedido o turno ya no admite pago");
  const amount = kind === "appointment" ? (doc as any).deposit.required : (doc as any).total;
  if (!(amount > 0)) throw AppError.badRequest("No hay nada para cobrar online");
  const title = kind === "appointment" ? `Seña turno ${code}` : `Pedido ${code}`;
  const pref = await new Preference(client()).create({
    body: {
      items: [{ id: code, title, quantity: 1, unit_price: amount, currency_id: "ARS" }],
      external_reference: `${kind}:${code}`,
      back_urls: {
        success: `${env.CLIENT_URL}/pago/resultado?code=${code}&kind=${kind}`,
        failure: `${env.CLIENT_URL}/pago/resultado?code=${code}&kind=${kind}&error=1`,
        pending: `${env.CLIENT_URL}/pago/resultado?code=${code}&kind=${kind}&pending=1`,
      },
      auto_return: "approved",
      notification_url: `${env.PUBLIC_API_URL}/api/v1/public/mercadopago/webhook`,
    },
  });
  return { initPoint: pref.init_point, preferenceId: pref.id };
}

/** Propina online: se cobra por Mercado Pago y, al aprobarse, se acredita al barbero. */
export async function createTipPreference(code: string, amount: number) {
  const appt = await Appointment.findOne({ code });
  if (!appt) throw AppError.notFound("Turno");
  if (appt.status !== "completed") throw AppError.conflict("Podés dejar propina cuando el turno ya se realizó");
  const pref = await new Preference(client()).create({
    body: {
      items: [{ id: `tip-${code}`, title: `Propina turno ${code}`, quantity: 1, unit_price: amount, currency_id: "ARS" }],
      external_reference: `tip:${code}`,
      back_urls: { success: `${env.CLIENT_URL}/pago/resultado?code=${code}&kind=tip`, failure: `${env.CLIENT_URL}/pago/resultado?code=${code}&kind=tip&error=1`, pending: `${env.CLIENT_URL}/pago/resultado?code=${code}&kind=tip&pending=1` },
      auto_return: "approved",
      notification_url: `${env.PUBLIC_API_URL}/api/v1/public/mercadopago/webhook`,
    },
  });
  return { initPoint: pref.init_point, preferenceId: pref.id };
}

/**
 * Cobro recurrente de la membresía (Suscripciones de Mercado Pago, 'preapproval').
 * El cliente autoriza una vez; Mercado Pago cobra cada mes y avisa por webhook.
 * Verificar en sandbox con credenciales de prueba antes de ofrecerlo (docs/MERCADOPAGO.md).
 */
export async function createMembershipCheckout(userId: string, planId: string) {
  const [user, plan] = await Promise.all([User.findById(userId), MembershipPlan.findOne({ _id: planId, active: true })]);
  if (!user?.client) throw AppError.forbidden("Tu usuario no tiene ficha de cliente");
  if (!plan) throw AppError.notFound("Plan de membresía");
  if (await Membership.exists({ client: user.client, status: "active" })) throw AppError.conflict("Ya tenés una membresía activa");
  const sub = await new PreApproval(client()).create({
    body: {
      reason: `Membresía ${plan.name}`,
      external_reference: `membership:${user.client}:${plan._id}`,
      payer_email: user.email,
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: plan.price, currency_id: "ARS" },
      back_url: `${env.CLIENT_URL}/cuenta`,
      status: "pending",
    },
  });
  return { initPoint: sub.init_point, preapprovalId: sub.id };
}

/** Aviso de la suscripción: autorizada → crea la membresía; pausada/cancelada → la frena. */
export async function handleSubscription(preapprovalId: string) {
  const sub = await new PreApproval(client()).get({ id: preapprovalId });
  const [kind, clientId, planId] = String(sub.external_reference ?? "").split(":");
  if (kind !== "membership" || !Types.ObjectId.isValid(clientId) || !Types.ObjectId.isValid(planId)) return { handled: false, reason: "referencia desconocida" };
  const existing = await Membership.findOne({ client: clientId, mpPreapprovalId: preapprovalId });
  if (sub.status === "authorized") {
    if (existing) {
      if (existing.status === "paused") await Membership.updateOne({ _id: existing._id }, { status: "active" });
      return { handled: true, status: sub.status, duplicate: true };
    }
    let created: { _id: unknown } | undefined;
    try {
      created = await commercial.subscribe({ plan: planId, client: clientId, actor: { name: "Mercado Pago" } });
      await Membership.updateOne({ _id: created._id }, { mpPreapprovalId: preapprovalId });
    } catch (err) {
      // Dos avisos «authorized» a la vez: gana el índice único; la membresía sobrante de este aviso se descarta.
      if (created) await Membership.deleteOne({ _id: created._id, mpPreapprovalId: { $exists: false } });
      if (await Membership.exists({ client: clientId, mpPreapprovalId: preapprovalId })) return { handled: true, status: sub.status, duplicate: true };
      throw err;
    }
    return { handled: true, status: sub.status };
  }
  if (existing && (sub.status === "cancelled" || sub.status === "paused")) {
    await Membership.updateOne({ _id: existing._id }, { status: sub.status === "cancelled" ? "cancelled" : "paused" });
    return { handled: true, status: sub.status };
  }
  return { handled: false, status: sub.status };
}

/** Valida la firma x-signature (ts + v1 HMAC-SHA256) según la documentación de Mercado Pago. */
export function verifySignature(headers: Record<string, string | string[] | undefined>, dataId: string) {
  if (!env.MP_WEBHOOK_SECRET) return false;
  const signature = String(headers["x-signature"] ?? "");
  const requestId = String(headers["x-request-id"] ?? "");
  const parts = Object.fromEntries(signature.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", env.MP_WEBHOOK_SECRET).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Nunca se confía en el body: se consulta el pago a la API y recién ahí se confirma.
 * Idempotente: el primer aviso de cada pago "reclama" el evento (índice único); los repetidos o
 * simultáneos devuelven `duplicate` sin tocar la caja. Si el procesamiento falla se libera el
 * reclamo para que el reintento de Mercado Pago lo vuelva a intentar.
 */
export async function handleNotification(paymentId: string) {
  const payment = await new Payment(client()).get({ id: paymentId });
  const id = String(payment.id ?? paymentId);
  if (payment.status !== "approved" || !payment.external_reference) return { handled: false, status: payment.status };

  try {
    await PaymentEvent.create({ paymentId: id });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    // Si un proceso anterior se cayó a mitad (reinicio/deploy) el reclamo queda «processing»: pasados 5 min se retoma.
    const stale = await PaymentEvent.findOneAndUpdate({ paymentId: id, outcome: "processing", updatedAt: { $lt: new Date(Date.now() - 5 * 60_000) } }, { detail: "retomado" });
    if (!stale) return { handled: false, duplicate: true, status: payment.status };
  }
  const finish = (outcome: "confirmed" | "ignored" | "needs_review", detail?: string) =>
    PaymentEvent.updateOne({ paymentId: id }, { outcome, detail }).then(() => ({ handled: outcome === "confirmed", status: payment.status, outcome }));

  try {
    const [kind, code] = payment.external_reference.split(":");
    const actor = { name: "Mercado Pago" };
    const paid = Number(payment.transaction_amount ?? 0);
    if (kind === "appointment") {
      const appt = await Appointment.findOne({ code });
      if (appt && ["pending_payment", "payment_review"].includes(appt.status)) {
        if (paid < (appt.deposit.required ?? 0)) {
          await audit(actor, { action: "custom", entity: "Pago", entityId: id, summary: `Mercado Pago aprobó $${paid} pero la seña de ${code} es $${appt.deposit.required}: revisar a mano` });
          return await finish("needs_review", "monto menor a la seña");
        }
        appt.deposit.mpPaymentId = id;
        await appt.save();
        await approveDeposit(String(appt._id), { amount: paid, method: "mercadopago" }, actor);
        return await finish("confirmed");
      }
    } else if (kind === "order") {
      const order = await Order.findOne({ code });
      if (order && ["pending_payment", "payment_review"].includes(order.status)) {
        if (paid < order.total) {
          await audit(actor, { action: "custom", entity: "Pago", entityId: id, summary: `Mercado Pago aprobó $${paid} pero el pedido ${code} es $${order.total}: revisar a mano` });
          return await finish("needs_review", "monto menor al pedido");
        }
        order.payment = { ...order.payment, mpPaymentId: id };
        await order.save();
        await approveOrder(String(order._id), "mercadopago", actor);
        return await finish("confirmed");
      }
    }
    if (kind === "tip") {
      const appt = await Appointment.findOne({ code, status: "completed" });
      if (appt && paid > 0) {
        await cash.record({ location: appt.location, direction: "in", method: "mercadopago", amount: paid, category: "tip", concept: `Propina online ${code}`, ref: { kind: "Appointment", id: appt._id }, actor });
        await ledger.post({ ownerType: "barber", owner: appt.barber, type: "tip", amount: paid, concept: `Propina online ${code}`, ref: { kind: "Appointment", id: appt._id }, actor });
        await Appointment.updateOne({ _id: appt._id }, { $inc: { tip: paid, paidAmount: paid } });
        return await finish("confirmed");
      }
    } else if (kind === "membership") {
      // Cobro mensual de una suscripción: el primero se registra sin extender (la membresía ya nació con su período); los siguientes renuevan.
      const m = await Membership.findOne({ client: code, mpPreapprovalId: { $exists: true }, status: { $in: ["active", "paused", "expired"] } }).sort({ createdAt: -1 });
      const location = await Location.findOne({ active: true }).sort({ order: 1 });
      // Cobro que llega antes que el aviso de la suscripción: se libera el reclamo y Mercado Pago reintenta.
      if (!m) throw new AppError(409, "La membresía todavía no está registrada: reintentar", "MEMBERSHIP_PENDING");
      if (m && location && paid > 0) {
        if (m.payments.length === 0) {
          m.payments.push({ date: new Date(), amount: paid, method: "mercadopago" });
          await m.save();
          await cash.record({ location: location._id, direction: "in", method: "mercadopago", amount: paid, category: "membership", concept: "Membresía (cobro automático)", party: { kind: "Client", id: m.client }, ref: { kind: "Membership", id: m._id }, actor });
        } else {
          await commercial.renewMembership(String(m._id), { method: "mercadopago", location: String(location._id) }, actor);
        }
        return await finish("confirmed");
      }
    }
    // Pago aprobado de algo que ya no está pendiente (reserva vencida, cancelada, referencia desconocida): hay plata cobrada sin turno.
    await audit(actor, { action: "custom", entity: "Pago", entityId: id, summary: `Mercado Pago aprobó el pago ${id} (${payment.external_reference}) pero no hay turno/pedido pendiente: reembolsar o reubicar` });
    return await finish("needs_review", "sin turno o pedido pendiente");
  } catch (err) {
    await PaymentEvent.deleteOne({ paymentId: id });
    throw err;
  }
}
