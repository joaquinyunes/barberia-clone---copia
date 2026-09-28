import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { audit } from "../audit/audit.service.js";
import { Movement, MOVEMENT_TYPES, OWNER_TYPES } from "./ledger.model.js";
import * as ledger from "./ledger.service.js";

export const ledgerRouter = Router();
ledgerRouter.use(authenticate, authorize("finance.manage", "reports.view"));

ledgerRouter.get("/types", (_req, res) => res.json(MOVEMENT_TYPES));

/** Todos los movimientos (sección "Movimientos"), con filtros. */
ledgerRouter.get("/movements", async (req, res) => {
  const q = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (q.ownerType) filter.ownerType = q.ownerType;
  if (q.owner) filter.owner = q.owner;
  if (q.type) filter.type = q.type;
  if (q.from || q.to) filter.date = { ...(q.from && { $gte: new Date(q.from) }), ...(q.to && { $lt: new Date(q.to) }) };
  const items = await Movement.find(filter).sort({ date: -1, createdAt: -1 }).limit(Number(q.limit) || 200).populate("owner", "name").lean();
  res.json({ items });
});

ledgerRouter.get("/:ownerType/:owner", async (req, res) => {
  const ownerType = z.enum(OWNER_TYPES).parse(req.params.ownerType);
  const { from, to } = req.query as Record<string, string>;
  res.json(await ledger.statement(ownerType, String(req.params.owner), from ? new Date(from) : undefined, to ? new Date(to) : undefined));
});

ledgerRouter.post(
  "/adjustments",
  authorize("finance.manage"),
  validate({
    body: z.object({
      ownerType: z.enum(OWNER_TYPES),
      owner: z.string(),
      type: z.enum(["adjustment", "bonus", "discount", "credit"]),
      amount: z.number().refine((n) => n !== 0),
      concept: z.string().min(3),
    }),
  }),
  async (req, res) => {
    const m = await ledger.post({ ...req.body, actor: req.user });
    await audit(req, { action: "create", entity: "Movimiento", entityId: m._id, summary: `registró ${req.body.concept} (${req.body.amount}) en cuenta de ${req.body.ownerType}` });
    res.status(201).json(m);
  },
);

ledgerRouter.post(
  "/movements/:id/reverse",
  authorize("finance.manage"),
  validate({ body: z.object({ reason: z.string().min(3) }) }),
  async (req, res) => {
    const m = await ledger.reverse(String(req.params.id), req.user!, req.body.reason);
    await audit(req, { action: "reverse", entity: "Movimiento", entityId: req.params.id, summary: `anuló un movimiento: ${req.body.reason}` });
    res.status(201).json(m);
  },
);
