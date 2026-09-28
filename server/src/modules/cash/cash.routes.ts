import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize, hasPermission } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../lib/AppError.js";
import { businessDayString } from "../../lib/dates.js";
import { formatARS } from "../../lib/money.js";
import { audit } from "../audit/audit.service.js";
import { dailyClose } from "../reports/reports.service.js";
import { getSettings, PAYMENT_METHODS } from "../settings/settings.model.js";
import { CashMovement, CashSession, CASH_CATEGORIES } from "./cash.model.js";
import * as cash from "./cash.service.js";

export const cashRouter = Router();
cashRouter.use(authenticate, authorize("cash.manage", "finance.manage"));

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");
const amounts = z.object(Object.fromEntries(PAYMENT_METHODS.map((m) => [m, z.number().min(0).optional()])));

cashRouter.get("/categories", (_req, res) => res.json(CASH_CATEGORIES));

/** Caja abierta de la sede. Con cierre ciego, quien no es admin/finanzas no ve lo "esperado". */
cashRouter.get("/current", async (req, res) => {
  const location = String(req.query.location ?? "");
  if (!location) throw AppError.badRequest("Indicá la sede");
  const session = await cash.openSession(location);
  if (!session) return res.json({ session: null });
  const totals = await cash.sessionTotals(session._id);
  const settings = await getSettings();
  const blind = settings.blindCashClose && !hasPermission(req, "finance.manage");
  res.json({ ...totals, expected: blind ? null : totals.expected, blind });
});

cashRouter.post("/open", validate({ body: z.object({ location: objectId, openingAmount: z.number().min(0) }) }), async (req, res) => {
  const s = await cash.open(req.body.location, req.body.openingAmount, req.user!);
  await audit(req, { action: "create", entity: "Caja", entityId: s._id, summary: `abrió la caja con ${formatARS(req.body.openingAmount)}` });
  res.status(201).json(s);
});

cashRouter.post(
  "/movements",
  validate({
    body: z.object({
      location: objectId,
      direction: z.enum(["in", "out"]),
      method: z.enum(PAYMENT_METHODS),
      amount: z.number().positive(),
      category: z.enum(["deposit_in", "withdrawal", "other", "refund"]),
      concept: z.string().min(2),
    }),
  }),
  async (req, res) => {
    const m = await cash.record({ ...req.body, actor: req.user });
    await audit(req, { action: "create", entity: "Caja", entityId: m._id, summary: `${req.body.direction === "in" ? "ingresó" : "retiró"} ${formatARS(req.body.amount)} (${req.body.concept})` });
    res.status(201).json(m);
  },
);

cashRouter.post(
  "/:id/close",
  validate({ body: z.object({ counted: amounts, denominations: z.record(z.string(), z.number().min(0)).optional(), notes: z.string().optional() }) }),
  async (req, res) => {
    const session = await CashSession.findById(req.params.id);
    if (!session) throw AppError.notFound("Caja");
    const summary = await dailyClose(businessDayString(session.openedAt), String(session.location));
    const closed = await cash.close(String(req.params.id), req.body.counted, req.user!, { ...req.body, summary });
    const diff = Object.values(closed.difference ?? {}).reduce((a: number, b) => a + (b as number), 0);
    await audit(req, { action: "update", entity: "Caja", entityId: closed._id, summary: `cerró la caja (diferencia ${formatARS(diff)})` });
    res.json(closed);
  },
);

cashRouter.get("/sessions", async (req, res) => {
  const { location } = req.query as Record<string, string>;
  res.json({ items: await CashSession.find(location ? { location } : {}).populate("location", "name").sort({ openedAt: -1 }).limit(60).lean() });
});

cashRouter.get("/sessions/:id", async (req, res) => {
  const totals = await cash.sessionTotals(String(req.params.id));
  res.json(totals);
});

cashRouter.get("/movements", async (req, res) => {
  const q = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (q.location) filter.location = q.location;
  if (q.method) filter.method = q.method;
  if (q.category) filter.category = q.category;
  if (q.from || q.to) filter.date = { ...(q.from && { $gte: new Date(q.from) }), ...(q.to && { $lt: new Date(q.to) }) };
  res.json({ items: await CashMovement.find(filter).sort({ date: -1 }).limit(Number(q.limit) || 300).lean() });
});
