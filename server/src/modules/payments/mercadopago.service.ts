import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { Appointment } from "../appointments/appointment.model.js";
import { approveDeposit } from "../appointments/appointment.service.js";
import { Order } from "../orders/order.model.js";
import { approveOrder } from "../orders/order.service.js";

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
  const amount = kind === "appointment" ? (doc as any).deposit.required : (doc as any).total;
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

/** Nunca se confía en el body: se consulta el pago a la API y recién ahí se confirma. */
export async function handleNotification(paymentId: string) {
  const payment = await new Payment(client()).get({ id: paymentId });
  if (payment.status !== "approved" || !payment.external_reference) return { handled: false, status: payment.status };
  const [kind, code] = payment.external_reference.split(":");
  const actor = { name: "Mercado Pago" };
  if (kind === "appointment") {
    const appt = await Appointment.findOne({ code });
    if (appt && ["pending_payment", "payment_review"].includes(appt.status)) {
      appt.deposit.mpPaymentId = String(payment.id);
      await appt.save();
      await approveDeposit(String(appt._id), { amount: payment.transaction_amount, method: "mercadopago" }, actor);
    }
  } else if (kind === "order") {
    const order = await Order.findOne({ code });
    if (order && ["pending_payment", "payment_review"].includes(order.status)) {
      order.payment = { ...order.payment, mpPaymentId: String(payment.id) };
      await order.save();
      await approveOrder(String(order._id), "mercadopago", actor);
    }
  }
  return { handled: true, status: payment.status };
}
