import { Types } from "mongoose";
import { AppError } from "../../lib/AppError.js";
import { randomCode } from "../../lib/codes.js";
import {
  addDays,
  businessWeekday,
  dayRange,
  minutesToTime,
  timeToMinutes,
  toBusinessDate,
  businessDayString,
} from "../../lib/dates.js";
import { env } from "../../config/env.js";
import { signLink } from "../../lib/tokens.js";
import { buildBookingMessage } from "../../lib/whatsapp/buildMessage.js";
import { waLink } from "../../lib/whatsapp/waLink.js";
import { Barber } from "../barbers/barber.model.js";
import * as cash from "../cash/cash.service.js";
import { Client } from "../clients/client.model.js";
import * as clients from "../clients/client.service.js";
import * as commercial from "../commercial/commercial.service.js";
import { GiftCard, Promotion } from "../commercial/commercial.models.js";
import * as ledger from "../ledger/ledger.service.js";
import { Location } from "../locations/location.model.js";
import { computeCommission } from "../services/commission.service.js";
import { Service } from "../services/service.model.js";
import { getSettings, type PaymentMethod, type Tender } from "../settings/settings.model.js";
import { Product } from "../inventory/inventory.models.js";
import { moveStock } from "../inventory/inventory.service.js";
import { Appointment, BLOCKING_STATUSES } from "./appointment.model.js";

type Actor = ledger.Actor;

/* ───────────────────────── Disponibilidad ───────────────────────── */

interface Interval {
  start: number;
  end: number;
}

async function busyIntervals(barberIds: Types.ObjectId[], date: string) {
  const { start, end } = dayRange(date);
  const now = new Date();
  const appts = await Appointment.find({
    barber: { $in: barberIds },
    startsAt: { $lt: end },
    endsAt: { $gt: start },
    status: { $in: BLOCKING_STATUSES },
    $or: [{ status: { $ne: "pending_payment" } }, { holdExpiresAt: { $gt: now } }],
  }).lean();
  const base = start.getTime();
  const map = new Map<string, Interval[]>();
  for (const a of appts) {
    const list = map.get(String(a.barber)) ?? [];
    list.push({ start: (a.startsAt.getTime() - base) / 60_000, end: (a.endsAt.getTime() - base) / 60_000 });
    map.set(String(a.barber), list);
  }
  return map;
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/** Horarios libres por barbero para un servicio en una fecha (YYYY-MM-DD). */
export async function availability(input: { location: string; service: string; date: string; barber?: string }) {
  const [location, service, settings] = await Promise.all([
    Location.findById(input.location).lean(),
    Service.findById(input.service).lean(),
    getSettings(),
  ]);
  if (!location || !location.active) throw AppError.notFound("Sede");
  if (!service || !service.active) throw AppError.notFound("Servicio");
  // Servicios exclusivos de algunas sedes (ej. La Cava VIP solo en Recoleta).
  if (service.locations?.length && !service.locations.some((l) => String(l) === String(location._id))) {
    throw AppError.badRequest("Ese servicio no se ofrece en esta sede");
  }

  const weekday = businessWeekday(input.date);
  const hours = location.openingHours?.find((h) => h.day === weekday);
  if (!hours || hours.closed || !hours.open || !hours.close) return { date: input.date, closed: true, barbers: [], slots: [] };

  const barberFilter: Record<string, unknown> = { location: location._id, status: "active" };
  if (input.barber && input.barber !== "any") barberFilter._id = input.barber;
  const barbers = (await Barber.find(barberFilter).lean()).filter(
    (b) => !b.services?.length || b.services.some((s) => String(s) === String(service._id)),
  );
  const dayStart = toBusinessDate(input.date, "00:00");
  const busy = await busyIntervals(barbers.map((b) => b._id), input.date);
  const nowMin = (Date.now() - dayStart.getTime()) / 60_000;
  const step = settings.slotStepMinutes ?? 15;

  const result = barbers.map((b) => {
    const day = b.schedule?.find((d) => d.day === weekday);
    const absent = b.absences?.some((a) => a.from && a.to && a.from <= addDays(dayStart, 1) && a.to >= dayStart);
    if (!day || day.off || !day.start || !day.end || absent) return { barber: { _id: b._id, name: b.name, photo: b.photo }, slots: [] as string[] };
    const from = Math.max(timeToMinutes(day.start), timeToMinutes(hours.open!));
    const to = Math.min(timeToMinutes(day.end), timeToMinutes(hours.close!));
    const blocked: Interval[] = [
      ...(busy.get(String(b._id)) ?? []),
      ...(day.breaks ?? []).filter((br) => br.start && br.end).map((br) => ({ start: timeToMinutes(br.start!), end: timeToMinutes(br.end!) })),
    ];
    const slots: string[] = [];
    for (let t = from; t + service.durationMin <= to; t += step) {
      if (t < nowMin + 30) continue; // mínimo 30 min de anticipación
      const slot = { start: t, end: t + service.durationMin };
      if (!blocked.some((i) => overlaps(slot, i))) slots.push(minutesToTime(t));
    }
    return { barber: { _id: b._id, name: b.name, photo: b.photo }, slots, load: busy.get(String(b._id))?.length ?? 0 };
  });

  const union = Array.from(new Set(result.flatMap((r) => r.slots))).sort();
  return { date: input.date, closed: false, barbers: result, slots: union };
}

/** "Cualquier barbero": el libre con menos turnos ese día. */
async function pickBarber(input: { location: string; service: string; date: string; time: string }) {
  const av = await availability(input);
  const candidates = av.barbers.filter((b) => b.slots.includes(input.time)).sort((a, b) => ((a as any).load ?? 0) - ((b as any).load ?? 0));
  if (!candidates.length) throw AppError.conflict("Ese horario ya no está disponible");
  return String(candidates[0].barber._id);
}

/* ───────────────────────── Reserva ───────────────────────── */

export interface BookingInput {
  location: string;
  service: string;
  barber: string; // id o "any"
  date: string;
  time: string;
  customer: { name: string; phone: string; email?: string };
  notes?: string;
  promoCode?: string;
  referralCode?: string;
  source?: "web" | "admin" | "walkin" | "whatsapp";
  skipDeposit?: boolean;
}

export async function createBooking(input: BookingInput, actor?: Actor) {
  const settings = await getSettings();
  const [location, service] = await Promise.all([Location.findById(input.location), Service.findById(input.service)]);
  if (!location) throw AppError.notFound("Sede");
  if (!service) throw AppError.notFound("Servicio");

  const barberId = input.barber === "any" ? await pickBarber(input) : input.barber;
  const av = await availability({ location: input.location, service: input.service, date: input.date, barber: barberId });
  if (!av.slots.includes(input.time)) throw AppError.conflict("Ese horario ya no está disponible. Elegí otro, por favor.");
  const barber = await Barber.findById(barberId);
  if (!barber) throw AppError.notFound("Barbero");

  const { client, isNew } = await clients.findOrCreate({
    ...input.customer,
    referralCode: input.referralCode,
    source: input.source,
    trustEmail: !!input.source && input.source !== "web",
  });
  const startsAt = toBusinessDate(input.date, input.time);
  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);

  // Descuentos: el mejor entre promo (código o automática), nivel del cliente y referido en 1.ª visita.
  let discount = 0;
  let discountReason: string | undefined;
  let promo: { code?: string; id?: Types.ObjectId } | undefined;
  const promoResult = await commercial.evaluatePromotion({ code: input.promoCode, service, startsAt, clientId: client._id, amount: service.price });
  if (promoResult) {
    discount = promoResult.discount;
    discountReason = promoResult.promo.name;
    promo = { code: promoResult.promo.code ?? undefined, id: promoResult.promo._id };
  }
  const tierPct = await clients.tierDiscountPct(client.tier);
  const tierDiscount = Math.round((service.price * tierPct) / 100);
  if (tierDiscount > discount) {
    discount = tierDiscount;
    discountReason = `Beneficio cliente ${client.tier}`;
    promo = undefined;
  }
  if (isNew && client.referredBy && settings.referredDiscountPct) {
    const refDiscount = Math.round((service.price * settings.referredDiscountPct) / 100);
    if (refDiscount > discount) {
      discount = refDiscount;
      discountReason = "Bienvenida por referido";
      promo = undefined;
    }
  }
  const total = service.price - discount;
  const depositRequired = input.skipDeposit ? 0 : Math.min(location.depositAmount ?? 0, total);

  try {
    const appt = await Appointment.create({
      code: randomCode("JEB"),
      location: location._id,
      service: service._id,
      serviceName: service.name,
      barber: barber._id,
      client: client._id,
      startsAt,
      endsAt,
      status: depositRequired > 0 ? "pending_payment" : "confirmed",
      source: input.source ?? "web",
      price: service.price,
      discount,
      discountReason,
      promo,
      total,
      deposit: { required: depositRequired },
      holdExpiresAt: depositRequired > 0 ? new Date(Date.now() + settings.holdMinutes * 60_000) : undefined,
      notes: input.notes,
      createdBy: actor?.name ?? "Web",
    });
    if (promo?.id) await Promotion.updateOne({ _id: promo.id }, { $inc: { uses: 1 } });
    return { appointment: appt, client, location, service, barber };
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw AppError.conflict("Ese horario se acaba de ocupar. Elegí otro, por favor.");
    throw err;
  }
}

/* ───────────────────────── Links, comprobante y WhatsApp ───────────────────────── */

export const manageToken = (code: string) => signLink({ code, scope: "booking" }, "30d");

export async function populated(id: unknown) {
  const appt = await Appointment.findById(id).populate("location service barber client");
  if (!appt) throw AppError.notFound("Turno");
  return appt;
}

export async function attachReceipt(code: string, file: { path: string; mime: string }) {
  const appt = await Appointment.findOne({ code });
  if (!appt) throw AppError.notFound("Turno");
  if (!["pending_payment", "payment_review", "cancelled"].includes(appt.status)) throw AppError.conflict("Este turno ya no admite comprobantes");
  if (appt.status === "cancelled") {
    if (appt.cancellation?.by !== "system") throw AppError.conflict("El turno fue cancelado");
    // venció la reserva pero pagó igual: se reactiva si el horario sigue libre
    // Cualquier turno que se superponga, no solo el que empieza a la misma hora.
    const clash = await Appointment.exists({
      _id: { $ne: appt._id },
      barber: appt.barber,
      startsAt: { $lt: appt.endsAt },
      endsAt: { $gt: appt.startsAt },
      status: { $in: BLOCKING_STATUSES },
    });
    if (clash) throw AppError.conflict("El horario fue tomado por otra persona. Contactanos por WhatsApp para reprogramar con tu seña.");
    appt.cancellation = undefined as never;
  }
  appt.deposit.receiptPath = file.path;
  appt.deposit.receiptMime = file.mime;
  appt.deposit.uploadedAt = new Date();
  appt.deposit.method = "transfer";
  appt.status = "payment_review";
  appt.holdExpiresAt = undefined;
  await appt.save();
  return appt;
}

export async function whatsappFor(id: unknown) {
  const appt = await populated(id);
  const settings = await getSettings();
  const loc = appt.location as any;
  const svc = appt.service as any;
  const receiptUrl = appt.deposit?.receiptPath
    ? `${env.PUBLIC_API_URL}/api/v1/public/receipts/${appt.code}?t=${signLink({ code: appt.code, scope: "receipt" }, "30d")}`
    : null;
  const text = buildBookingMessage({
    businessName: settings.businessName,
    code: appt.code,
    client: appt.client as any,
    location: loc,
    service: svc,
    barber: appt.barber as any,
    startsAt: appt.startsAt,
    total: appt.total,
    discount: appt.discount,
    promoCode: appt.promo?.code,
    deposit: { required: appt.deposit?.required ?? 0, paid: appt.deposit?.paid ?? 0, method: appt.deposit?.method },
    receiptUrl,
    mpPaymentId: appt.deposit?.mpPaymentId,
    notes: appt.notes,
    adminUrl: `${env.CLIENT_URL}/admin/turnos?code=${appt.code}`,
  });
  appt.whatsappSentAt = new Date();
  await appt.save();
  return { text, url: waLink(loc.whatsapp, text), phone: loc.whatsapp, receiptUrl };
}

/* ───────────────────────── Seña: aprobar / rechazar ───────────────────────── */

export async function approveDeposit(id: string, input: { amount?: number; method?: PaymentMethod }, actor: Actor) {
  const appt = await Appointment.findById(id);
  if (!appt) throw AppError.notFound("Turno");
  if (!["payment_review", "pending_payment"].includes(appt.status)) throw AppError.conflict("El turno no está esperando la seña");
  const amount = input.amount ?? appt.deposit.required ?? 0;
  const method = input.method ?? (appt.deposit.method as PaymentMethod) ?? "transfer";
  if (amount > 0) {
    await cash.record({ location: appt.location, direction: "in", method, amount, category: "deposit", concept: `Seña ${appt.code}`, party: { kind: "Client", id: appt.client }, ref: { kind: "Appointment", id: appt._id }, actor });
    await ledger.post({ ownerType: "client", owner: appt.client, type: "deposit", amount, concept: `Seña turno ${appt.code}`, method, location: appt.location, ref: { kind: "Appointment", id: appt._id }, actor });
  }
  appt.deposit.paid = amount;
  appt.deposit.method = method;
  appt.deposit.approvedAt = new Date();
  appt.deposit.approvedBy = actor.name;
  appt.paidAmount = amount;
  appt.status = "confirmed";
  appt.holdExpiresAt = undefined;
  await appt.save();
  return appt;
}

export async function rejectDeposit(id: string, reason: string, actor: Actor) {
  const appt = await Appointment.findById(id);
  if (!appt || appt.status !== "payment_review") throw AppError.conflict("El turno no tiene un comprobante para revisar");
  const settings = await getSettings();
  appt.status = "pending_payment";
  appt.deposit.rejectedReason = `${reason} (${actor.name})`;
  appt.holdExpiresAt = new Date(Date.now() + settings.holdMinutes * 60_000);
  await appt.save();
  return appt;
}

/* ───────────────────────── Finalizar turno: cobro + comisión ───────────────────────── */

export interface CompleteInput {
  payments: { tender: Tender; amount: number; giftCardCode?: string }[];
  tip?: { amount: number; method: PaymentMethod };
  products?: { product: string; qty: number }[];
  allowDebt?: boolean;
  cutNote?: string;
}

export async function complete(id: string, input: CompleteInput, actor: Actor) {
  const appt = await Appointment.findById(id);
  if (!appt) throw AppError.notFound("Turno");
  if (!["confirmed", "in_progress", "payment_review", "pending_payment"].includes(appt.status)) throw AppError.conflict(`No se puede finalizar un turno ${appt.status}`);
  const [service, barber, client, settings] = await Promise.all([
    Service.findById(appt.service),
    Barber.findById(appt.barber),
    Client.findById(appt.client),
    getSettings(),
  ]);
  if (!service || !barber || !client) throw AppError.notFound("Datos del turno");

  // ── Validaciones previas: nada se registra hasta que todo sea válido ──
  const productDocs: { doc: InstanceType<typeof Product>; qty: number }[] = [];
  for (const p of input.products ?? []) {
    const prod = await Product.findById(p.product);
    if (!prod) throw AppError.notFound("Producto");
    if (prod.stock < p.qty) throw AppError.conflict(`Stock insuficiente de ${prod.name}`);
    productDocs.push({ doc: prod, qty: p.qty });
  }
  const productsTotal = productDocs.reduce((a, p) => a + p.qty * p.doc.price, 0);
  const charge = appt.total + productsTotal;
  const usesCash = input.payments.some((p) => p.tender === "cash" && p.amount > 0) || input.tip?.method === "cash";
  if (usesCash && !(await cash.openSession(appt.location))) {
    throw AppError.conflict("No hay caja abierta en esta sede. Abrí la caja para cobrar en efectivo.");
  }
  let projected = 0;
  let coverage: Awaited<ReturnType<typeof commercial.coverageFor>> = null;
  for (const p of input.payments) {
    if (["cash", "transfer", "mercadopago", "card"].includes(p.tender)) projected += p.amount;
    if (p.tender === "giftcard") {
      if (!p.giftCardCode) throw AppError.badRequest("Falta el código de la gift card");
      const gc = await GiftCard.findOne({ code: p.giftCardCode.toUpperCase(), status: "active" });
      if (!gc || (gc.expiresAt && gc.expiresAt < new Date())) throw AppError.badRequest("Gift card inválida, vencida o sin saldo");
      projected += Math.min(gc.balance, p.amount);
    }
    if (p.tender === "membership" || p.tender === "pack") {
      coverage = await commercial.coverageFor(client._id, service);
      if (!coverage || coverage.kind !== p.tender) throw AppError.badRequest(`El cliente no tiene ${p.tender === "pack" ? "un pack" : "una membresía"} con cupo para este servicio`);
      projected += appt.total;
    }
  }
  const currentBalance = await ledger.balanceOf("client", client._id);
  const limit = await clients.creditLimitOf(client);
  const projectedBalance = currentBalance - charge + projected;
  if (projectedBalance < -limit && !input.allowDebt) {
    throw new AppError(409, `El cliente quedaría debiendo ${-projectedBalance} y supera su tope de ${limit}. Autorizá la deuda para continuar.`, "CREDIT_LIMIT", { balance: projectedBalance, limit });
  }

  // Productos vendidos en el turno
  const products: { product: Types.ObjectId; name: string; qty: number; unitPrice: number }[] = [];
  for (const { doc, qty } of productDocs) {
    await moveStock({ product: doc._id, type: "sale", qty: -qty, reason: `Venta turno ${appt.code}`, barber: barber._id, location: appt.location, ref: { kind: "Appointment", id: appt._id }, actor });
    products.push({ product: doc._id, name: doc.name, qty, unitPrice: doc.price });
  }
  const ref = { kind: "Appointment", id: appt._id };

  // 1) Se carga el consumo en la cuenta del cliente
  await ledger.post({ ownerType: "client", owner: client._id, type: "service_charge", amount: -appt.total, concept: `${service.name} (${appt.code})`, location: appt.location, ref, actor });
  if (productsTotal) await ledger.post({ ownerType: "client", owner: client._id, type: "product_charge", amount: -productsTotal, concept: products.map((p) => `${p.qty} ${p.name}`).join(", "), location: appt.location, ref, actor });

  // 2) Se registran los pagos según el medio
  let paidNow = 0;
  let prepaidCovered = 0;
  for (const p of input.payments) {
    if (!(p.amount > 0) && !["membership", "pack"].includes(p.tender)) continue;
    if (["cash", "transfer", "mercadopago", "card"].includes(p.tender)) {
      await cash.record({ location: appt.location, direction: "in", method: p.tender as PaymentMethod, amount: p.amount, category: "sale", concept: `${service.name} ${appt.code}`, party: { kind: "Client", id: client._id, name: client.name }, ref, actor });
      await ledger.post({ ownerType: "client", owner: client._id, type: "payment", amount: p.amount, concept: `Pago ${appt.code}`, method: p.tender, location: appt.location, ref, actor });
      paidNow += p.amount;
    } else if (p.tender === "giftcard") {
      if (!p.giftCardCode) throw AppError.badRequest("Falta el código de la gift card");
      const r = await commercial.redeemGiftCard(p.giftCardCode, p.amount, appt.code);
      await ledger.post({ ownerType: "client", owner: client._id, type: "credit", amount: r.used, concept: `Gift card ${p.giftCardCode.toUpperCase()}`, location: appt.location, ref, actor });
      paidNow += r.used;
    } else if (p.tender === "membership" || p.tender === "pack") {
      const cov = coverage!;
      await commercial.consumeCoverage(cov.kind, cov.id, service, appt._id);
      await ledger.post({ ownerType: "client", owner: client._id, type: "credit", amount: appt.total, concept: `Cubierto por ${cov.label}`, location: appt.location, ref, actor });
      paidNow += appt.total;
      prepaidCovered += appt.total;
    }
    // "balance": usa el saldo a favor; no mueve dinero (el cargo ya lo descuenta)
  }

  // 4) Propina: entra a caja y se acredita al barbero
  if (input.tip?.amount) {
    await cash.record({ location: appt.location, direction: "in", method: input.tip.method, amount: input.tip.amount, category: "tip", concept: `Propina ${barber.name} (${appt.code})`, ref, actor });
    await ledger.post({ ownerType: "barber", owner: barber._id, type: "tip", amount: input.tip.amount, concept: `Propina ${appt.code}`, ref, actor });
  }

  // 5) Comisión automática del barbero
  const base = settings.commissionOnNet ? appt.total : appt.price;
  const { amount: commission, rule } = await computeCommission(barber, service, base);
  if (commission > 0) {
    await ledger.post({ ownerType: "barber", owner: barber._id, type: "commission", amount: commission, concept: `Comisión ${service.name} — ${client.name}`, location: appt.location, ref, actor });
  }

  appt.set({
    status: "completed",
    completedAt: new Date(),
    commission,
    commissionRule: rule,
    tip: input.tip?.amount ?? 0,
    products,
    payments: [
      ...(appt.deposit?.paid ? [{ tender: appt.deposit.method ?? "transfer", amount: appt.deposit.paid, at: appt.deposit.approvedAt, ref: "seña" }] : []),
      ...input.payments.filter((p) => p.amount > 0 || ["membership", "pack"].includes(p.tender)).map((p) => ({ tender: p.tender, amount: p.amount || appt.total, at: new Date(), ref: p.giftCardCode })),
    ],
    paidAmount: (appt.deposit?.paid ?? 0) + paidNow + (input.tip?.amount ?? 0),
  });
  appt.prepaidCovered = prepaidCovered;
  await appt.save();

  if (input.cutNote) client.cutNotes.push({ date: new Date(), barber: barber._id, text: input.cutNote, appointment: appt._id });
  if (!client.preferredBarber) client.preferredBarber = barber._id;
  await client.save();
  await clients.afterVisit(client._id, appt.startsAt, actor);

  return { appointment: appt, clientBalance: await ledger.balanceOf("client", client._id), charge, commission };
}

/* ───────────────────────── Cancelaciones, ausencias y reprogramaciones ───────────────────────── */

export async function cancel(id: string, input: { by: "client" | "business" | "no_show" | "system"; reason?: string }, actor?: Actor) {
  const appt = await Appointment.findById(id);
  if (!appt) throw AppError.notFound("Turno");
  if (["completed", "cancelled", "no_show"].includes(appt.status)) throw AppError.conflict("El turno ya está cerrado");
  const settings = await getSettings();
  const noticeHours = Math.round(((appt.startsAt.getTime() - Date.now()) / 3_600_000) * 10) / 10;
  const depositPaid = appt.deposit?.paid ?? 0;
  const retained = depositPaid > 0 && (input.by === "no_show" || (input.by === "client" && noticeHours < settings.cancellationHours));
  if (retained) {
    // la seña queda para la barbería: se descuenta del saldo a favor del cliente
    await ledger.post({ ownerType: "client", owner: appt.client, type: "adjustment", amount: -depositPaid, concept: `Seña retenida (${input.by === "no_show" ? "no asistió" : "cancelación tardía"}) ${appt.code}`, ref: { kind: "Appointment", id: appt._id }, actor });
  }
  appt.status = input.by === "no_show" ? "no_show" : "cancelled";
  appt.cancellation = { by: input.by, reason: input.reason, at: new Date(), noticeHours, depositRetained: retained };
  appt.holdExpiresAt = undefined;
  await appt.save();
  return appt;
}

export async function reschedule(id: string, input: { date: string; time: string; barber?: string }, actor?: Actor) {
  const appt = await Appointment.findById(id);
  if (!appt) throw AppError.notFound("Turno");
  if (!["pending_payment", "payment_review", "confirmed"].includes(appt.status)) throw AppError.conflict("Este turno no se puede reprogramar");
  const barber = input.barber ?? String(appt.barber);
  const av = await availability({ location: String(appt.location), service: String(appt.service), date: input.date, barber });
  if (!av.slots.includes(input.time)) throw AppError.conflict("Ese horario no está disponible");
  const oldStart = appt.startsAt;
  const duration = appt.endsAt.getTime() - appt.startsAt.getTime();
  appt.startsAt = toBusinessDate(input.date, input.time);
  appt.endsAt = new Date(appt.startsAt.getTime() + duration);
  appt.barber = new Types.ObjectId(barber);
  appt.notes = [appt.notes, `Reprogramado desde ${businessDayString(oldStart)} por ${actor?.name ?? "cliente"}`].filter(Boolean).join(" · ");
  await appt.save();
  return appt;
}

/** Libera turnos cuya seña no se pagó a tiempo (lo corre un job cada minuto). */
export async function expireHolds() {
  const expired = await Appointment.find({ status: "pending_payment", holdExpiresAt: { $lt: new Date() } }, "_id");
  for (const a of expired) await cancel(String(a._id), { by: "system", reason: "Seña no abonada a tiempo" });
  return expired.length;
}
