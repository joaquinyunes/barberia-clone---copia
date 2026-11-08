import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { Appointment } from "../appointments/appointment.model.js";
import { approveDeposit } from "../appointments/appointment.service.js";
import { Order } from "../orders/order.model.js";
import { approveOrder } from "../orders/order.service.js";
import { audit } from "../audit/audit.service.js";
import { PaymentEvent } from "./paymentEvent.model.js";

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
    if ((err as { code?: number }).code === 11000) return { handled: false, duplicate: true, status: payment.status };
    throw err;
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
    // Pago aprobado de algo que ya no está pendiente (reserva vencida, cancelada, referencia desconocida): hay plata cobrada sin turno.
    await audit(actor, { action: "custom", entity: "Pago", entityId: id, summary: `Mercado Pago aprobó el pago ${id} (${payment.external_reference}) pero no hay turno/pedido pendiente: reembolsar o reubicar` });
    return await finish("needs_review", "sin turno o pedido pendiente");
  } catch (err) {
    await PaymentEvent.deleteOne({ paymentId: id });
    throw err;
  }
}
