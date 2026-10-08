import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate.js";
import { publicWriteLimiter } from "../../middlewares/rateLimiters.js";
import { AppError } from "../../lib/AppError.js";
import { readStored, saveReceipt, uploadReceipt } from "../../lib/storage.js";
import { verifyLink } from "../../lib/tokens.js";
import { Appointment } from "../appointments/appointment.model.js";
import * as appointments from "../appointments/appointment.service.js";
import { Barber } from "../barbers/barber.model.js";
import { MembershipPlan, PackPlan } from "../commercial/commercial.models.js";
import * as commercial from "../commercial/commercial.service.js";
import { Product } from "../inventory/inventory.models.js";
import { Location } from "../locations/location.model.js";
import { Order } from "../orders/order.model.js";
import * as orders from "../orders/order.service.js";
import * as mp from "../payments/mercadopago.service.js";
import { Service } from "../services/service.model.js";
import { getSettings } from "../settings/settings.model.js";
import { ContactMessage } from "./contact.model.js";

export const publicRouter = Router();

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^\d{2}:\d{2}$/);

/* ── Catálogo ── */
publicRouter.get("/site", async (_req, res) => {
  const s = await getSettings();
  const mpOn = mp.mpEnabled();
  res.json({ businessName: s.businessName, whatsapp: s.whatsappMain, cancellationHours: s.cancellationHours, holdMinutes: s.holdMinutes, mercadoPago: mpOn, referredDiscountPct: s.referredDiscountPct });
});

publicRouter.get("/locations", async (_req, res) => {
  res.json(await Location.find({ active: true }).select("-bankCbu").sort({ order: 1 }).lean());
});
publicRouter.get("/locations/:slug", async (req, res) => {
  const loc = await Location.findOne({ slug: req.params.slug, active: true }).select("-bankCbu").lean();
  if (!loc) throw AppError.notFound("Sede");
  const barbers = await Barber.find({ location: loc._id, public: true, status: { $in: ["active", "vacation"] } }).select("name slug photo bio specialties instagram status").sort({ order: 1 }).lean();
  res.json({ ...loc, barbers });
});

publicRouter.get("/services", async (req, res) => {
  const { category, location } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { active: true };
  if (category) filter.category = category;
  if (location) filter.$or = [{ locations: { $size: 0 } }, { locations: location }];
  res.json(await Service.find(filter).select("-supplyCost -commission -priceHistory").sort({ order: 1 }).lean());
});

publicRouter.get("/barbers", async (req, res) => {
  const { location, service } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { public: true, status: "active" };
  if (location) filter.location = location;
  if (service) filter.$or = [{ services: { $size: 0 } }, { services: service }];
  res.json(await Barber.find(filter).select("name slug photo bio specialties instagram location").sort({ order: 1 }).lean());
});

publicRouter.get("/shop", async (_req, res) => {
  const [products, packs, memberships] = await Promise.all([
    Product.find({ shop: true, active: true }).select("name slug kind category description images price stock giftValue featured").sort({ featured: -1, name: 1 }).lean(),
    PackPlan.find({ shop: true, active: true }).lean(),
    MembershipPlan.find({ active: true }).lean(),
  ]);
  res.json({ products, packs, memberships });
});
publicRouter.get("/shop/products/:slug", async (req, res) => {
  const p = await Product.findOne({ slug: req.params.slug, shop: true, active: true }).select("-cost -supplier").lean();
  if (!p) throw AppError.notFound("Producto");
  const related = await Product.find({ _id: { $ne: p._id }, shop: true, active: true, category: p.category }).select("name slug images price kind").limit(4).lean();
  res.json({ ...p, related });
});

/* ── Reservas ── */
publicRouter.get(
  "/availability",
  validate({ query: z.object({ location: objectId, service: objectId, date, barber: z.string().optional() }) }),
  async (req, res) => {
    res.json(await appointments.availability(req.query as never));
  },
);

publicRouter.post(
  "/promotions/validate",
  validate({ body: z.object({ code: z.string().min(2), service: objectId, date, time }) }),
  async (req, res) => {
    const service = await Service.findById(req.body.service);
    if (!service) throw AppError.notFound("Servicio");
    const { toBusinessDate } = await import("../../lib/dates.js");
    const r = await commercial.evaluatePromotion({ code: req.body.code, service, startsAt: toBusinessDate(req.body.date, req.body.time), amount: service.price });
    res.json({ valid: !!r, name: r?.promo.name, discount: r?.discount ?? 0, total: service.price - (r?.discount ?? 0) });
  },
);

publicRouter.post(
  "/bookings",
  publicWriteLimiter,
  validate({
    body: z.object({
      location: objectId,
      service: objectId,
      barber: z.union([objectId, z.literal("any")]),
      date,
      time,
      customer: z.object({
        name: z.string().trim().min(2, "Ingresá tu nombre"),
        phone: z.string().trim().min(8, "Ingresá un teléfono válido"),
        email: z.string().trim().email("Email inválido").optional().or(z.literal("").transform(() => undefined)),
      }),
      notes: z.string().max(300).optional(),
      promoCode: z.string().optional(),
      referralCode: z.string().optional(),
    }),
  }),
  async (req, res) => {
    const r = await appointments.createBooking({ ...req.body, source: "web" });
    const a = r.appointment;
    res.status(201).json({
      code: a.code,
      token: appointments.manageToken(a.code),
      status: a.status,
      startsAt: a.startsAt,
      holdExpiresAt: a.holdExpiresAt,
      price: a.price,
      discount: a.discount,
      discountReason: a.discountReason,
      total: a.total,
      deposit: a.deposit.required,
      service: { name: r.service.name, durationMin: r.service.durationMin },
      barber: { name: r.barber.name },
      location: { name: r.location.name, address: r.location.address, whatsapp: r.location.whatsapp },
      bank: { alias: r.location.bankAlias, cbu: r.location.bankCbu, holder: r.location.bankHolder },
      referralCode: r.client.referralCode,
    });
  },
);

/** Todo lo que sigue exige el token de gestión de la reserva (?token=...). */
function bookingCode(token: unknown, code: string) {
  try {
    const data = verifyLink<{ code: string; scope: string }>(String(token ?? ""));
    if (data.code !== code || data.scope !== "booking") throw new Error();
  } catch {
    throw AppError.unauthorized("Link inválido o vencido");
  }
}

publicRouter.get("/bookings/:code", async (req, res) => {
  bookingCode(req.query.token, String(req.params.code));
  const a = await Appointment.findOne({ code: req.params.code }).populate("location service barber", "name address durationMin whatsapp").lean({ virtuals: true });
  if (!a) throw AppError.notFound("Turno");
  const { commission, commissionRule, ...safe } = a as Record<string, unknown>;
  res.json(safe);
});

publicRouter.post("/bookings/:code/receipt", publicWriteLimiter, uploadReceipt.single("receipt"), async (req, res) => {
  bookingCode(req.query.token, String(req.params.code));
  const file = await saveReceipt(req.file);
  const a = await appointments.attachReceipt(String(req.params.code), file);
  res.json({ status: a.status });
});

publicRouter.get("/bookings/:code/whatsapp", async (req, res) => {
  bookingCode(req.query.token, String(req.params.code));
  const a = await Appointment.findOne({ code: req.params.code });
  if (!a) throw AppError.notFound("Turno");
  res.json(await appointments.whatsappFor(a._id));
});

publicRouter.post("/bookings/:code/cancel", async (req, res) => {
  bookingCode(req.query.token, String(req.params.code));
  const a = await Appointment.findOne({ code: req.params.code });
  if (!a) throw AppError.notFound("Turno");
  const r = await appointments.cancel(String(a._id), { by: "client", reason: String(req.body?.reason ?? "Cancelado por el cliente") });
  res.json({ status: r.status, depositRetained: r.cancellation?.depositRetained });
});

publicRouter.post("/bookings/:code/reschedule", validate({ body: z.object({ date, time }) }), async (req, res) => {
  bookingCode(req.query.token, String(req.params.code));
  const a = await Appointment.findOne({ code: req.params.code });
  if (!a) throw AppError.notFound("Turno");
  const s = await getSettings();
  if (a.startsAt.getTime() - Date.now() < s.cancellationHours * 3_600_000) {
    throw AppError.conflict(`Solo se puede reprogramar online con ${s.cancellationHours} h de anticipación. Escribinos por WhatsApp.`);
  }
  const r = await appointments.reschedule(String(a._id), req.body);
  res.json({ startsAt: r.startsAt });
});

/** Descarga del calendario (.ics) para agregar el turno a Google / Apple Calendar. */
publicRouter.get("/bookings/:code/calendar.ics", async (req, res) => {
  bookingCode(req.query.token, String(req.params.code));
  const a = await Appointment.findOne({ code: req.params.code }).populate("location service barber");
  if (!a) throw AppError.notFound("Turno");
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  // RFC 5545: en textos hay que escapar \ , ; y saltos de línea (las direcciones llevan coma).
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
  const loc = a.location as any;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jack el Barbero//Turnos//ES",
    "BEGIN:VEVENT",
    `UID:${a.code}@jackelbarbero`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(a.startsAt)}`,
    `DTEND:${fmt(a.endsAt)}`,
    `SUMMARY:${esc(`${(a.service as any).name} con ${(a.barber as any).name} – Jack el Barbero`)}`,
    `LOCATION:${esc(`${loc.name} – ${loc.address}`)}`,
    `DESCRIPTION:Código de reserva ${a.code}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="turno-${a.code}.ics"`);
  res.send(ics);
});

/* ── Tienda ── */
publicRouter.post(
  "/orders",
  publicWriteLimiter,
  validate({
    body: z.object({
      items: z.array(z.object({ kind: z.enum(["product", "pack"]), id: objectId, qty: z.number().int().min(1).max(20) })).min(1),
      customer: z.object({ name: z.string().trim().min(2), phone: z.string().trim().min(8), email: z.string().email().optional().or(z.literal("").transform(() => undefined)) }),
      location: objectId,
      recipient: z.object({ name: z.string().optional(), phone: z.string().optional(), message: z.string().max(200).optional() }).optional(),
      notes: z.string().max(300).optional(),
    }),
  }),
  async (req, res) => {
    const order = await orders.createOrder(req.body);
    const loc = await Location.findById(order.location).lean();
    res.status(201).json({
      code: order.code,
      token: appointments.manageToken(order.code),
      total: order.total,
      items: order.items,
      bank: { alias: loc?.bankAlias, cbu: loc?.bankCbu, holder: loc?.bankHolder },
    });
  },
);

publicRouter.post("/orders/:code/receipt", publicWriteLimiter, uploadReceipt.single("receipt"), async (req, res) => {
  bookingCode(req.query.token, String(req.params.code));
  const file = await saveReceipt(req.file);
  const o = await orders.attachOrderReceipt(String(req.params.code), file);
  res.json({ status: o.status });
});

publicRouter.get("/orders/:code/whatsapp", async (req, res) => {
  bookingCode(req.query.token, String(req.params.code));
  const o = await Order.findOne({ code: req.params.code });
  if (!o) throw AppError.notFound("Pedido");
  res.json(await orders.orderWhatsapp(o._id));
});

/* ── Comprobantes (link firmado que viaja en el WhatsApp) ── */
publicRouter.get("/receipts/:code", async (req, res) => {
  let data: { code: string; scope: string };
  try {
    data = verifyLink(String(req.query.t ?? ""));
  } catch {
    throw AppError.unauthorized("Link vencido o inválido");
  }
  if (data.code !== req.params.code || data.scope !== "receipt") throw AppError.forbidden();
  const doc = (await Appointment.findOne({ code: data.code }).lean()) ?? (await Order.findOne({ code: data.code }).lean());
  const receipt = doc && ("deposit" in doc ? { path: doc.deposit?.receiptPath, mime: doc.deposit?.receiptMime } : { path: (doc as any).payment?.receiptPath, mime: (doc as any).payment?.receiptMime });
  if (!receipt?.path) throw AppError.notFound("Comprobante");
  res.setHeader("Content-Type", receipt.mime ?? "application/octet-stream");
  res.setHeader("Cache-Control", "private, max-age=300");
  res.send(await readStored(receipt.path));
});

/* ── Mercado Pago (etapa 2) ── */
publicRouter.post("/mercadopago/preference", validate({ body: z.object({ kind: z.enum(["appointment", "order"]), code: z.string(), token: z.string() }) }), async (req, res) => {
  bookingCode(req.body.token, req.body.code);
  res.json(await mp.createPreference(req.body.kind, req.body.code));
});

publicRouter.post("/mercadopago/webhook", async (req, res) => {
  const dataId = String(req.query["data.id"] ?? req.body?.data?.id ?? "");
  const type = String(req.query.type ?? req.body?.type ?? "");
  if (type !== "payment" || !dataId) return res.status(200).json({ ignored: true });
  if (!mp.verifySignature(req.headers, dataId)) return res.status(401).json({ error: "Firma inválida" });
  res.json(await mp.handleNotification(dataId));
});

/* ── Contacto ── */
publicRouter.post(
  "/contact",
  publicWriteLimiter,
  validate({ body: z.object({ name: z.string().trim().min(2), email: z.string().trim().email(), phone: z.string().optional(), location: objectId.optional(), message: z.string().trim().min(10).max(2000) }) }),
  async (req, res) => {
    await ContactMessage.create(req.body);
    res.status(201).json({ ok: true });
  },
);
