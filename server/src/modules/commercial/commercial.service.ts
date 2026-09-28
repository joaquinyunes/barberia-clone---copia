import { Types } from "mongoose";
import { AppError } from "../../lib/AppError.js";
import { randomCode } from "../../lib/codes.js";
import { addDays, businessTimeString, shiftToBusiness, timeToMinutes } from "../../lib/dates.js";
import * as cash from "../cash/cash.service.js";
import * as ledger from "../ledger/ledger.service.js";
import type { PaymentMethod } from "../settings/settings.model.js";
import { Appointment } from "../appointments/appointment.model.js";
import { ClientPack, GiftCard, Membership, MembershipPlan, PackPlan, Promotion } from "./commercial.models.js";

type Actor = ledger.Actor;
interface Allowance {
  service?: unknown;
  category?: string | null;
  label?: string | null;
  quantity?: number | null;
}

const allowanceKey = (a: Allowance) => (a.service ? `service:${a.service}` : `category:${a.category}`);
const toUsage = (items: Allowance[]) =>
  items.map((i) => ({ key: allowanceKey(i), label: i.label ?? i.category ?? "Servicio", total: i.quantity ?? 0, used: 0 }));

/** Busca en un listado de cupos uno que cubra este servicio (primero por servicio exacto, después por categoría). */
const findUsage = <T extends { key?: string | null; total?: number | null; used?: number | null }>(usage: T[], service: { _id: unknown; category: string }) =>
  usage.find((u) => u.key === `service:${service._id}` && (u.used ?? 0) < (u.total ?? 0)) ??
  usage.find((u) => u.key === `category:${service.category}` && (u.used ?? 0) < (u.total ?? 0));

/* ── Gift cards ── */

export async function issueGiftCard(input: {
  value: number;
  buyer?: string;
  recipientName?: string;
  recipientPhone?: string;
  message?: string;
  validityDays?: number;
  sale?: { method: PaymentMethod; location: string; price?: number };
  order?: unknown;
  actor: Actor;
}) {
  const gc = await GiftCard.create({
    code: randomCode("GFT"),
    initialValue: input.value,
    balance: input.value,
    buyer: input.buyer,
    recipientName: input.recipientName,
    recipientPhone: input.recipientPhone,
    message: input.message,
    order: input.order,
    expiresAt: addDays(new Date(), input.validityDays ?? 365),
    issuedBy: input.actor.name,
  });
  if (input.sale) {
    await cash.record({
      location: input.sale.location,
      direction: "in",
      method: input.sale.method,
      amount: input.sale.price ?? input.value,
      category: "giftcard_sale",
      concept: `Gift card ${gc.code}`,
      ref: { kind: "GiftCard", id: gc._id },
      actor: input.actor,
    });
  }
  return gc;
}

export async function redeemGiftCard(code: string, amount: number, ref: string) {
  const gc = await GiftCard.findOne({ code: code.toUpperCase() });
  if (!gc || gc.status !== "active") throw AppError.badRequest("Gift card inválida o sin saldo");
  if (gc.expiresAt && gc.expiresAt < new Date()) {
    gc.status = "expired";
    await gc.save();
    throw AppError.badRequest("La gift card está vencida");
  }
  const used = Math.min(gc.balance, amount);
  gc.balance -= used;
  gc.redemptions.push({ amount: used, date: new Date(), ref });
  if (gc.balance <= 0) gc.status = "used";
  await gc.save();
  return { used, remaining: gc.balance, giftCard: gc };
}

/* ── Packs / bonos ── */

export async function issuePack(input: { plan: string; client: string; sale?: { method: PaymentMethod; location: string }; actor: Actor }) {
  const plan = await PackPlan.findById(input.plan);
  if (!plan) throw AppError.notFound("Pack");
  const pack = await ClientPack.create({
    code: randomCode("BONO"),
    client: input.client,
    plan: plan._id,
    name: plan.name,
    usage: toUsage(plan.items),
    pricePaid: input.sale ? plan.price : 0,
    expiresAt: addDays(new Date(), plan.validityDays ?? 180),
    issuedBy: input.actor.name,
  });
  if (input.sale) {
    await cash.record({ location: input.sale.location, direction: "in", method: input.sale.method, amount: plan.price, category: "pack", concept: `${plan.name} (${pack.code})`, party: { kind: "Client", id: new Types.ObjectId(input.client) }, ref: { kind: "ClientPack", id: pack._id }, actor: input.actor });
  }
  return pack;
}

/* ── Membresías ── */

export async function subscribe(input: { plan: string; client: string; payment?: { method: PaymentMethod; location: string }; actor: Actor }) {
  const plan = await MembershipPlan.findById(input.plan);
  if (!plan) throw AppError.notFound("Plan de membresía");
  if (await Membership.exists({ client: input.client, status: "active" })) throw AppError.conflict("El cliente ya tiene una membresía activa");
  const now = new Date();
  const m = await Membership.create({
    client: input.client,
    plan: plan._id,
    periodStart: now,
    renewsAt: addDays(now, 30),
    usage: toUsage(plan.items),
    payments: input.payment ? [{ date: now, amount: plan.price, method: input.payment.method }] : [],
  });
  if (input.payment) {
    await cash.record({ location: input.payment.location, direction: "in", method: input.payment.method, amount: plan.price, category: "membership", concept: `Membresía ${plan.name}`, party: { kind: "Client", id: new Types.ObjectId(input.client) }, ref: { kind: "Membership", id: m._id }, actor: input.actor });
  }
  return m;
}

export async function renewMembership(id: string, payment: { method: PaymentMethod; location: string }, actor: Actor) {
  const m = await Membership.findById(id);
  if (!m) throw AppError.notFound("Membresía");
  const plan = await MembershipPlan.findById(m.plan);
  if (!plan) throw AppError.notFound("Plan de membresía");
  const start = m.renewsAt && m.renewsAt > new Date() ? m.renewsAt : new Date();
  m.set({ status: "active", periodStart: start, renewsAt: addDays(start, 30), usage: toUsage(plan.items) });
  m.payments.push({ date: new Date(), amount: plan.price, method: payment.method });
  await m.save();
  await cash.record({ location: payment.location, direction: "in", method: payment.method, amount: plan.price, category: "membership", concept: `Renovación ${plan.name}`, party: { kind: "Client", id: m.client }, ref: { kind: "Membership", id: m._id }, actor });
  return m;
}

/** ¿Qué cubre este servicio? Membresía primero, después packs. Devuelve la opción sin consumirla. */
export async function coverageFor(clientId: unknown, service: { _id: unknown; category: string }) {
  const membership = await Membership.findOne({ client: clientId, status: "active", renewsAt: { $gt: new Date() } }).populate("plan");
  if (membership && findUsage(membership.usage, service)) return { kind: "membership" as const, id: membership._id, label: (membership.plan as any)?.name };
  const packs = await ClientPack.find({ client: clientId, status: "active", expiresAt: { $gt: new Date() } });
  const pack = packs.find((p) => findUsage(p.usage, service));
  if (pack) return { kind: "pack" as const, id: pack._id, label: pack.name ?? pack.code };
  return null;
}

export async function consumeCoverage(kind: "membership" | "pack", id: unknown, service: { _id: unknown; category: string }, appointmentId: unknown) {
  if (kind === "membership") {
    const m = await Membership.findById(id);
    const u = m && findUsage(m.usage, service);
    if (!m || !u) throw AppError.badRequest("La membresía no tiene cupo para este servicio");
    u.used = (u.used ?? 0) + 1;
    await m.save();
    return m;
  }
  const p = await ClientPack.findById(id);
  const u = p && findUsage(p.usage, service);
  if (!p || !u) throw AppError.badRequest("El pack no tiene cupo para este servicio");
  u.used = (u.used ?? 0) + 1;
  p.history.push({ date: new Date(), label: u.label ?? "", appointment: appointmentId as Types.ObjectId });
  if (p.usage.every((x) => (x.used ?? 0) >= (x.total ?? 0))) p.status = "used";
  await p.save();
  return p;
}

/* ── Promociones ── */

export async function evaluatePromotion(input: {
  code?: string;
  service: { _id: unknown; price: number };
  startsAt: Date;
  clientId?: unknown;
  amount: number;
}) {
  const now = new Date();
  const candidates = input.code
    ? await Promotion.find({ code: input.code.toUpperCase(), active: true })
    : await Promotion.find({ automatic: true, active: true });
  if (input.code && !candidates.length) throw AppError.badRequest("Código promocional inválido");

  let best: { promo: (typeof candidates)[number]; discount: number } | null = null;
  const reasons: string[] = [];
  for (const p of candidates) {
    const fail = (r: string) => reasons.push(r);
    if (p.validFrom && p.validFrom > now) { fail("La promoción todavía no empezó"); continue; }
    if (p.validTo && p.validTo < now) { fail("La promoción está vencida"); continue; }
    if (p.maxUses && p.uses >= p.maxUses) { fail("La promoción alcanzó el máximo de usos"); continue; }
    if (p.services.length && !p.services.some((s) => String(s) === String(input.service._id))) { fail("No aplica a este servicio"); continue; }
    const local = shiftToBusiness(input.startsAt);
    if (p.days?.length && !p.days.includes(local.getUTCDay())) { fail("No aplica ese día"); continue; }
    if (p.timeFrom && p.timeTo) {
      const t = timeToMinutes(businessTimeString(input.startsAt));
      if (t < timeToMinutes(p.timeFrom) || t >= timeToMinutes(p.timeTo)) { fail(`Válida de ${p.timeFrom} a ${p.timeTo}`); continue; }
    }
    if (p.minAmount && input.amount < p.minAmount) { fail("No alcanza el monto mínimo"); continue; }
    if (p.newClientsOnly && input.clientId && (await Appointment.exists({ client: input.clientId, status: "completed" }))) { fail("Solo para clientes nuevos"); continue; }
    if (p.maxUsesPerClient && input.clientId) {
      const used = await Appointment.countDocuments({ client: input.clientId, "promo.id": p._id, status: { $nin: ["cancelled"] } });
      if (used >= p.maxUsesPerClient) { fail("Ya usaste esta promoción"); continue; }
    }
    const discount =
      p.type === "percent" ? Math.round((input.amount * p.value) / 100) : p.type === "fixed" ? Math.min(p.value, input.amount) : Math.max(0, input.amount - p.value);
    if (!best || discount > best.discount) best = { promo: p, discount };
  }
  if (input.code && !best) throw AppError.badRequest(reasons[0] ?? "El código no aplica");
  return best;
}
