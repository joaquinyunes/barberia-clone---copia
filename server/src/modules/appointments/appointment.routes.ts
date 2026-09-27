import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize, hasPermission } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../lib/AppError.js";
import { dayRange } from "../../lib/dates.js";
import { formatARS } from "../../lib/money.js";
import { audit } from "../audit/audit.service.js";
import { PAYMENT_METHODS, TENDER_TYPES } from "../settings/settings.model.js";
import { Appointment, APPOINTMENT_STATUSES } from "./appointment.model.js";
import * as svc from "./appointment.service.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^\d{2}:\d{2}$/);

export const appointmentsRouter = Router();
appointmentsRouter.use(authenticate, authorize("appointments.manage", "appointments.own"));

/** Un barbero sin permiso de gestión solo ve y toca sus propios turnos. */
async function scoped(req: Parameters<Parameters<typeof appointmentsRouter.get>[1]>[0], id: string) {
  const appt = await Appointment.findById(id);
  if (!appt) throw AppError.notFound("Turno");
  if (!hasPermission(req, "appointments.manage") && String(appt.barber) !== String(req.user?.barber)) throw AppError.forbidden();
  return appt;
}

appointmentsRouter.get("/", async (req, res) => {
  const q = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (!hasPermission(req, "appointments.manage")) filter.barber = req.user?.barber;
  else if (q.barber) filter.barber = q.barber;
  if (q.location) filter.location = q.location;
  if (q.client) filter.client = q.client;
  if (q.code) filter.code = q.code.toUpperCase();
  if (q.status) filter.status = { $in: q.status.split(",") };
  if (q.date) {
    const { start, end } = dayRange(q.date);
    filter.startsAt = { $gte: start, $lt: end };
  } else if (q.from || q.to) {
    filter.startsAt = { ...(q.from && { $gte: new Date(q.from) }), ...(q.to && { $lt: new Date(q.to) }) };
  }
  const items = await Appointment.find(filter)
    .populate("client", "name phone tier")
    .populate("barber", "name")
    .populate("service", "name category durationMin")
    .populate("location", "name")
    .sort({ startsAt: q.sort === "desc" ? -1 : 1 })
    .limit(Math.min(Number(q.limit) || 300, 1000))
    .lean({ virtuals: true });
  res.json({ items, statuses: APPOINTMENT_STATUSES });
});

/** Registro de cancelaciones separado por tipo (cliente, barbería, no-show, reprogramado). */
appointmentsRouter.get("/cancellations", authorize("appointments.manage"), async (req, res) => {
  const { from, to } = req.query as Record<string, string>;
  const items = await Appointment.find({
    status: { $in: ["cancelled", "no_show"] },
    ...(from || to ? { startsAt: { ...(from && { $gte: new Date(from) }), ...(to && { $lt: new Date(to) }) } } : {}),
  })
    .populate("client barber service", "name")
    .sort({ "cancellation.at": -1 })
    .limit(500)
    .lean();
  const byType: Record<string, number> = {};
  for (const a of items) byType[a.cancellation?.by ?? "otro"] = (byType[a.cancellation?.by ?? "otro"] ?? 0) + 1;
  res.json({ items, byType, retainedDeposits: items.filter((a) => a.cancellation?.depositRetained).reduce((s, a) => s + (a.deposit?.paid ?? 0), 0) });
});

appointmentsRouter.get("/:id", async (req, res) => {
  await scoped(req, String(req.params.id));
  res.json(await svc.populated(req.params.id));
});

appointmentsRouter.get("/:id/whatsapp", async (req, res) => {
  await scoped(req, String(req.params.id));
  res.json(await svc.whatsappFor(req.params.id));
});

appointmentsRouter.post(
  "/",
  authorize("appointments.manage"),
  validate({
    body: z.object({
      location: objectId,
      service: objectId,
      barber: z.union([objectId, z.literal("any")]),
      date,
      time,
      customer: z.object({ name: z.string().min(2), phone: z.string().min(6), email: z.string().email().optional() }),
      notes: z.string().optional(),
      promoCode: z.string().optional(),
      source: z.enum(["admin", "walkin", "whatsapp"]).default("admin"),
      skipDeposit: z.boolean().default(true),
    }),
  }),
  async (req, res) => {
    const r = await svc.createBooking(req.body, req.user);
    await audit(req, { action: "create", entity: "Turno", entityId: r.appointment._id, summary: `agendó turno ${r.appointment.code} para ${r.client.name}` });
    res.status(201).json(r.appointment);
  },
);

appointmentsRouter.post(
  "/:id/approve-deposit",
  authorize("appointments.manage", "cash.manage"),
  validate({ body: z.object({ amount: z.number().min(0).optional(), method: z.enum(PAYMENT_METHODS).optional() }) }),
  async (req, res) => {
    const a = await svc.approveDeposit(String(req.params.id), req.body, req.user!);
    await audit(req, { action: "update", entity: "Turno", entityId: a._id, summary: `aprobó la seña del turno ${a.code} (${formatARS(a.deposit.paid ?? 0)})` });
    res.json(a);
  },
);

appointmentsRouter.post("/:id/reject-deposit", authorize("appointments.manage"), validate({ body: z.object({ reason: z.string().min(3) }) }), async (req, res) => {
  const a = await svc.rejectDeposit(String(req.params.id), req.body.reason, req.user!);
  await audit(req, { action: "update", entity: "Turno", entityId: a._id, summary: `rechazó el comprobante del turno ${a.code}: ${req.body.reason}` });
  res.json(a);
});

appointmentsRouter.post("/:id/start", async (req, res) => {
  const a = await scoped(req, String(req.params.id));
  if (a.status !== "confirmed") throw AppError.conflict("Solo se pueden iniciar turnos confirmados");
  a.status = "in_progress";
  await a.save();
  res.json(a);
});

appointmentsRouter.post(
  "/:id/complete",
  validate({
    body: z.object({
      payments: z.array(z.object({ tender: z.enum(TENDER_TYPES), amount: z.number().min(0), giftCardCode: z.string().optional() })).default([]),
      tip: z.object({ amount: z.number().min(0), method: z.enum(PAYMENT_METHODS) }).optional(),
      products: z.array(z.object({ product: objectId, qty: z.number().int().positive() })).optional(),
      allowDebt: z.boolean().optional(),
      cutNote: z.string().optional(),
    }),
  }),
  async (req, res) => {
    await scoped(req, String(req.params.id));
    if (req.body.allowDebt && !hasPermission(req, "cash.manage")) throw AppError.forbidden("Solo caja/administración puede autorizar deudas");
    const r = await svc.complete(String(req.params.id), req.body, req.user!);
    await audit(req, { action: "update", entity: "Turno", entityId: r.appointment._id, summary: `finalizó el turno ${r.appointment.code} (comisión ${formatARS(r.commission)})` });
    res.json(r);
  },
);

appointmentsRouter.post(
  "/:id/cancel",
  validate({ body: z.object({ by: z.enum(["client", "business", "no_show"]), reason: z.string().optional() }) }),
  async (req, res) => {
    await scoped(req, String(req.params.id));
    const a = await svc.cancel(String(req.params.id), req.body, req.user);
    await audit(req, { action: "update", entity: "Turno", entityId: a._id, summary: `${a.status === "no_show" ? "marcó no-show" : "canceló"} el turno ${a.code}${a.cancellation?.depositRetained ? " (seña retenida)" : ""}` });
    res.json(a);
  },
);

appointmentsRouter.post(
  "/:id/reschedule",
  authorize("appointments.manage"),
  validate({ body: z.object({ date, time, barber: objectId.optional() }) }),
  async (req, res) => {
    const a = await svc.reschedule(String(req.params.id), req.body, req.user);
    await audit(req, { action: "update", entity: "Turno", entityId: a._id, summary: `reprogramó el turno ${a.code}` });
    res.json(a);
  },
);
