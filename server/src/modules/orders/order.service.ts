import { AppError } from "../../lib/AppError.js";
import { randomCode } from "../../lib/codes.js";
import { env } from "../../config/env.js";
import { signLink } from "../../lib/tokens.js";
import { buildOrderMessage } from "../../lib/whatsapp/buildMessage.js";
import { waLink } from "../../lib/whatsapp/waLink.js";
import * as cash from "../cash/cash.service.js";
import * as clients from "../clients/client.service.js";
import { PackPlan } from "../commercial/commercial.models.js";
import * as commercial from "../commercial/commercial.service.js";
import { Product } from "../inventory/inventory.models.js";
import { moveStock } from "../inventory/inventory.service.js";
import type { Actor } from "../ledger/ledger.service.js";
import { Location } from "../locations/location.model.js";
import { getSettings, type PaymentMethod } from "../settings/settings.model.js";
import { Order } from "./order.model.js";

export async function createOrder(input: {
  items: { kind: "product" | "pack"; id: string; qty: number }[];
  customer: { name: string; phone: string; email?: string };
  location: string;
  recipient?: { name?: string; phone?: string; message?: string };
  notes?: string;
}) {
  const location = await Location.findById(input.location);
  if (!location) throw AppError.notFound("Sede");
  const items = [];
  for (const i of input.items) {
    if (i.kind === "product") {
      const p = await Product.findOne({ _id: i.id, shop: true, active: true });
      if (!p) throw AppError.notFound("Producto");
      if (p.kind === "sale" && p.stock < i.qty) throw AppError.conflict(`Sin stock suficiente de ${p.name}`);
      items.push({ kind: "product", product: p._id, name: p.name, qty: i.qty, unitPrice: p.price });
    } else {
      const plan = await PackPlan.findOne({ _id: i.id, shop: true, active: true });
      if (!plan) throw AppError.notFound("Pack");
      items.push({ kind: "pack", packPlan: plan._id, name: plan.name, qty: i.qty, unitPrice: plan.price });
    }
  }
  const { client } = await clients.findOrCreate({ ...input.customer, source: "tienda" });
  return Order.create({
    code: randomCode("PED"),
    client: client._id,
    location: location._id,
    items,
    total: items.reduce((a, i) => a + i.qty * i.unitPrice, 0),
    recipient: input.recipient,
    notes: input.notes,
  });
}

export async function attachOrderReceipt(code: string, file: { path: string; mime: string }) {
  const order = await Order.findOne({ code });
  if (!order) throw AppError.notFound("Pedido");
  if (!["pending_payment", "payment_review"].includes(order.status)) throw AppError.conflict("Este pedido ya no admite comprobantes");
  order.payment = { ...order.payment, method: "transfer", receiptPath: file.path, receiptMime: file.mime, uploadedAt: new Date() };
  order.status = "payment_review";
  await order.save();
  return order;
}

export async function orderWhatsapp(id: unknown) {
  const order = await Order.findById(id).populate("client location");
  if (!order) throw AppError.notFound("Pedido");
  const settings = await getSettings();
  const loc = order.location as any;
  const receiptUrl = order.payment?.receiptPath
    ? `${env.PUBLIC_API_URL}/api/v1/public/receipts/${order.code}?t=${signLink({ code: order.code, scope: "receipt" }, "30d")}`
    : null;
  const text = buildOrderMessage({
    businessName: settings.businessName,
    code: order.code,
    client: order.client as any,
    items: order.items.map((i) => ({ name: i.name ?? "", qty: i.qty ?? 1, unitPrice: i.unitPrice ?? 0 })),
    total: order.total,
    recipient: order.recipient,
    method: order.payment?.method ?? "transfer",
    receiptUrl,
    location: loc,
    notes: order.notes,
    adminUrl: `${env.CLIENT_URL}/admin/pedidos?code=${order.code}`,
  });
  order.whatsappSentAt = new Date();
  await order.save();
  return { text, url: waLink(loc.whatsapp, text), phone: loc.whatsapp, receiptUrl };
}

/** Aprueba el pago: entra a caja, baja stock y emite gift cards / packs. */
export async function approveOrder(id: string, method: PaymentMethod, actor: Actor) {
  const order = await Order.findById(id);
  if (!order) throw AppError.notFound("Pedido");
  if (!["pending_payment", "payment_review"].includes(order.status)) throw AppError.conflict("El pedido no está pendiente de pago");
  const giftCards: string[] = [];
  const packs: string[] = [];
  for (const item of order.items) {
    const amount = (item.qty ?? 1) * (item.unitPrice ?? 0);
    if (item.kind === "pack") {
      for (let n = 0; n < (item.qty ?? 1); n++) {
        const pack = await commercial.issuePack({ plan: String(item.packPlan), client: String(order.client), actor });
        packs.push(pack.code);
      }
      await cash.record({ location: order.location, direction: "in", method, amount, category: "pack", concept: `${item.name} (${order.code})`, ref: { kind: "Order", id: order._id }, actor });
      continue;
    }
    const product = await Product.findById(item.product);
    if (!product) throw AppError.notFound("Producto");
    if (product.kind === "giftcard") {
      for (let n = 0; n < (item.qty ?? 1); n++) {
        const gc = await commercial.issueGiftCard({ value: product.giftValue ?? product.price, buyer: String(order.client), recipientName: order.recipient?.name ?? undefined, recipientPhone: order.recipient?.phone ?? undefined, message: order.recipient?.message ?? undefined, order: order._id, actor });
        giftCards.push(gc.code);
      }
      await cash.record({ location: order.location, direction: "in", method, amount, category: "giftcard_sale", concept: `${item.name} (${order.code})`, ref: { kind: "Order", id: order._id }, actor });
    } else {
      await moveStock({ product: product._id, type: "sale", qty: -(item.qty ?? 1), reason: `Pedido ${order.code}`, location: order.location, ref: { kind: "Order", id: order._id }, actor });
      await cash.record({ location: order.location, direction: "in", method, amount, category: "product_sale", concept: `${item.name} (${order.code})`, ref: { kind: "Order", id: order._id }, actor });
    }
  }
  order.status = "paid";
  order.payment = { ...order.payment, method, approvedAt: new Date(), approvedBy: actor.name };
  order.issued = { giftCards, packs };
  await order.save();
  return order;
}
