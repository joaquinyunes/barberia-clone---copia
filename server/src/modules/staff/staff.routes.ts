import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../lib/AppError.js";
import { businessDayString, currentPeriod, monthRange } from "../../lib/dates.js";
import { formatARS } from "../../lib/money.js";
import { audit } from "../audit/audit.service.js";
import { Barber } from "../barbers/barber.model.js";
import { PAYMENT_METHODS } from "../settings/settings.model.js";
import { Attendance, Debt, DEBT_CATEGORIES, Goal, Settlement } from "./staff.models.js";
import * as staff from "./staff.service.js";

export const staffRouter = Router();
staffRouter.use(authenticate);

const method = z.enum(PAYMENT_METHODS);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");

/* Adelantos */
staffRouter.post(
  "/advances",
  authorize("finance.manage"),
  validate({
    body: z.object({
      barber: objectId,
      amount: z.number().positive(),
      method: method.default("cash"),
      reason: z.string().optional(),
      location: objectId.optional(),
      force: z.boolean().optional(),
    }),
  }),
  async (req, res) => {
    const result = await staff.giveAdvance({ ...req.body, actor: req.user! });
    const barber = await Barber.findById(req.body.barber).lean();
    await audit(req, { action: "create", entity: "Adelanto", entityId: result.movement._id, summary: `dio un adelanto de ${formatARS(req.body.amount)} a ${barber?.name}` });
    res.status(201).json(result);
  },
);

/* Deudas / préstamos en cuotas */
staffRouter.get("/debts", authorize("finance.manage"), async (req, res) => {
  const { barber, status } = req.query as Record<string, string>;
  const items = await Debt.find({ ...(barber && { barber }), ...(status && { status }) }).populate("barber", "name").sort({ createdAt: -1 });
  res.json({ items, categories: DEBT_CATEGORIES });
});

staffRouter.post(
  "/debts",
  authorize("finance.manage"),
  validate({
    body: z.object({
      barber: objectId,
      category: z.enum(Object.keys(DEBT_CATEGORIES) as [keyof typeof DEBT_CATEGORIES]),
      concept: z.string().min(2),
      total: z.number().positive(),
      installments: z.number().int().min(1).max(48).default(1),
      firstDueDate: z.coerce.date().optional(),
      frequencyDays: z.number().int().min(1).optional(),
      disbursed: z.boolean().optional(),
      method: method.optional(),
      location: objectId.optional(),
      tool: objectId.optional(),
    }),
  }),
  async (req, res) => {
    const debt = await staff.createDebt({ ...req.body, actor: req.user! });
    const barber = await Barber.findById(req.body.barber).lean();
    await audit(req, { action: "create", entity: "Deuda", entityId: debt._id, summary: `registró deuda de ${barber?.name}: ${req.body.concept} ${formatARS(req.body.total)} en ${req.body.installments} cuotas` });
    res.status(201).json(debt);
  },
);

staffRouter.post("/debts/apply-due", authorize("finance.manage"), async (req, res) => {
  const barbers = req.body?.barber ? [req.body.barber] : (await Barber.find({}, "_id").lean()).map((b) => String(b._id));
  let total = 0;
  for (const b of barbers) total += await staff.applyDueInstallments(b, new Date(), req.user!);
  if (total) await audit(req, { action: "custom", entity: "Deuda", summary: `aplicó cuotas vencidas por ${formatARS(total)}` });
  res.json({ applied: total });
});

staffRouter.post("/debts/:id/cancel", authorize("finance.manage"), async (req, res) => {
  const debt = await Debt.findById(req.params.id);
  if (!debt) throw AppError.notFound("Deuda");
  debt.status = "cancelled";
  debt.installments.forEach((i) => i.status === "pending" && (i.status = "cancelled"));
  await debt.save();
  await audit(req, { action: "update", entity: "Deuda", entityId: debt._id, summary: `canceló la deuda "${debt.concept}"` });
  res.json(debt);
});

/* Objetivos */
staffRouter.get("/goals", authorize("finance.manage", "barbers.manage"), async (req, res) => {
  const period = (req.query.period as string) || currentPeriod();
  const goals = await Goal.find({ period }).lean();
  const items = await Promise.all(goals.map((g) => staff.goalProgress(String(g._id))));
  res.json({ period, items });
});

staffRouter.post(
  "/goals",
  authorize("finance.manage"),
  validate({
    body: z.object({
      barber: objectId,
      period: z.string().regex(/^\d{4}-\d{2}$/),
      targets: z.array(z.object({ metric: z.enum(["revenue", "services", "haircuts", "beards", "products", "new_clients"]), target: z.number().positive() })).min(1),
      bonus: z.object({ type: z.enum(["fixed", "percent"]), value: z.number().min(0) }).optional(),
      tiers: z.array(z.object({ pct: z.number(), bonus: z.number() })).optional(),
      notes: z.string().optional(),
    }),
  }),
  async (req, res) => {
    const goal = await Goal.findOneAndUpdate({ barber: req.body.barber, period: req.body.period }, req.body, { upsert: true, new: true });
    await audit(req, { action: "update", entity: "Objetivo", entityId: goal._id, summary: `configuró objetivo ${req.body.period}` });
    res.status(201).json(await staff.goalProgress(String(goal._id)));
  },
);

staffRouter.delete("/goals/:id", authorize("finance.manage"), async (req, res) => {
  await Goal.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

/* Asistencia */
staffRouter.get("/attendance", authorize("barbers.manage"), async (req, res) => {
  const { barber, from, to, date } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (barber) filter.barber = barber;
  if (date) filter.date = date;
  else filter.date = { $gte: from ?? businessDayString(new Date()).slice(0, 8) + "01", $lte: to ?? "9999" };
  res.json({ items: await Attendance.find(filter).populate("barber", "name").sort({ date: -1 }).lean() });
});

staffRouter.post("/attendance/check-in", authorize("barbers.manage"), validate({ body: z.object({ barber: objectId }) }), async (req, res) => {
  res.status(201).json(await staff.checkIn(req.body.barber));
});
staffRouter.post("/attendance/check-out", authorize("barbers.manage"), validate({ body: z.object({ barber: objectId }) }), async (req, res) => {
  res.json(await staff.checkOut(req.body.barber));
});

/** Fichaje con PIN desde la tablet del local (sin sesión de admin). */
export const attendanceKioskRouter = Router();
attendanceKioskRouter.post("/", validate({ body: z.object({ pin: z.string().min(4), action: z.enum(["in", "out"]) }) }), async (req, res) => {
  const barber = await Barber.findOne({ attendancePin: req.body.pin, status: "active" }).select("+attendancePin");
  if (!barber) throw AppError.unauthorized("PIN incorrecto");
  const record = req.body.action === "in" ? await staff.checkIn(String(barber._id)) : await staff.checkOut(String(barber._id));
  res.json({ barber: barber.name, record });
});

staffRouter.patch(
  "/attendance/:id",
  authorize("barbers.manage"),
  validate({ body: z.object({ status: z.enum(["present", "absent", "justified", "day_off"]).optional(), note: z.string().optional(), overtimeMinutes: z.number().min(0).optional(), lateMinutes: z.number().min(0).optional() }) }),
  async (req, res) => {
    const r = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!r) throw AppError.notFound("Registro de asistencia");
    await audit(req, { action: "update", entity: "Asistencia", entityId: r._id, summary: `corrigió asistencia del ${r.date}` });
    res.json(r);
  },
);

staffRouter.post(
  "/attendance/absence",
  authorize("barbers.manage"),
  validate({ body: z.object({ barber: objectId, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), status: z.enum(["absent", "justified", "day_off"]), note: z.string().optional() }) }),
  async (req, res) => {
    const r = await Attendance.findOneAndUpdate({ barber: req.body.barber, date: req.body.date }, req.body, { upsert: true, new: true });
    res.status(201).json(r);
  },
);

/* Liquidaciones */
const periodSchema = z.object({ barber: objectId, period: z.string().regex(/^\d{4}-\d{2}$/).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() });
const rangeOf = (b: z.infer<typeof periodSchema>) => {
  if (b.from && b.to) return { start: b.from, end: b.to };
  return monthRange(b.period ?? currentPeriod());
};

staffRouter.post("/settlements/preview", authorize("finance.manage"), validate({ body: periodSchema }), async (req, res) => {
  const { start, end } = rangeOf(req.body);
  res.json(await staff.settlementPreview(req.body.barber, start, end));
});

staffRouter.post(
  "/settlements",
  authorize("finance.manage"),
  validate({ body: periodSchema.extend({ label: z.string().optional(), method: method.default("cash"), location: objectId.optional() }) }),
  async (req, res) => {
    const { start, end } = rangeOf(req.body);
    const s = await staff.closeSettlement({ ...req.body, from: start, to: end, actor: req.user! });
    const barber = await Barber.findById(req.body.barber).lean();
    await audit(req, { action: "create", entity: "Liquidación", entityId: s._id, summary: `cerró la liquidación ${req.body.label ?? ""} de ${barber?.name}: ${formatARS(s.payout ?? 0)}` });
    res.status(201).json(s);
  },
);

staffRouter.get("/settlements", authorize("finance.manage"), async (req, res) => {
  const { barber } = req.query as Record<string, string>;
  res.json({ items: await Settlement.find(barber ? { barber } : {}).populate("barber", "name").sort({ createdAt: -1 }).limit(200).lean() });
});
