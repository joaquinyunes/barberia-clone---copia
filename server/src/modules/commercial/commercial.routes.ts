import { Router } from "express";
import { z } from "zod";
import { crudRouter } from "../../core/crudRouter.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../lib/AppError.js";
import { formatARS } from "../../lib/money.js";
import { audit } from "../audit/audit.service.js";
import { PAYMENT_METHODS } from "../settings/settings.model.js";
import { ClientPack, GiftCard, Membership, MembershipPlan, PackPlan, Promotion } from "./commercial.models.js";
import * as commercial from "./commercial.service.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");
const sale = z.object({ method: z.enum(PAYMENT_METHODS), location: objectId });
const allowance = z.object({ service: objectId.optional(), category: z.string().optional(), label: z.string().optional(), quantity: z.number().int().positive() });

export const packPlansRouter = crudRouter({
  model: PackPlan,
  entity: "Pack",
  permission: "commercial.manage",
  schema: z.object({ name: z.string().min(2), description: z.string().optional(), items: z.array(allowance).min(1), price: z.number().min(0), validityDays: z.number().int().positive().optional(), shop: z.boolean().optional(), active: z.boolean().optional() }),
  sort: { price: 1 },
  softDelete: true,
});

export const membershipPlansRouter = crudRouter({
  model: MembershipPlan,
  entity: "Plan de membresía",
  permission: "commercial.manage",
  schema: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    price: z.number().min(0),
    items: z.array(allowance),
    productDiscountPct: z.number().min(0).max(100).optional(),
    serviceDiscountPct: z.number().min(0).max(100).optional(),
    priorityBooking: z.boolean().optional(),
    priceLock: z.boolean().optional(),
    active: z.boolean().optional(),
  }),
  sort: { price: 1 },
  softDelete: true,
});

export const promotionsRouter = crudRouter({
  model: Promotion,
  entity: "Promoción",
  permission: "commercial.manage",
  schema: z.object({
    name: z.string().min(2),
    code: z.string().toUpperCase().optional(),
    description: z.string().optional(),
    type: z.enum(["percent", "fixed", "fixed_price"]),
    value: z.number().min(0),
    services: z.array(objectId).optional(),
    days: z.array(z.number().min(0).max(6)).optional(),
    timeFrom: z.string().optional(),
    timeTo: z.string().optional(),
    minAmount: z.number().min(0).optional(),
    maxUses: z.number().int().positive().optional(),
    maxUsesPerClient: z.number().int().positive().optional(),
    validFrom: z.coerce.date().optional(),
    validTo: z.coerce.date().optional(),
    newClientsOnly: z.boolean().optional(),
    automatic: z.boolean().optional(),
    active: z.boolean().optional(),
  }),
  searchFields: ["name", "code"],
  sort: { createdAt: -1 },
});

export const commercialRouter = Router();
commercialRouter.use(authenticate, authorize("commercial.manage", "cash.manage"));

/* Gift cards */
commercialRouter.get("/giftcards", async (req, res) => {
  const { status, search } = req.query as Record<string, string>;
  const items = await GiftCard.find({ ...(status && { status }), ...(search && { code: new RegExp(search, "i") }) }).populate("buyer", "name").sort({ createdAt: -1 }).limit(300).lean();
  res.json({ items, liability: items.filter((g) => g.status === "active").reduce((a, g) => a + g.balance, 0) });
});
commercialRouter.get("/giftcards/:code", async (req, res) => {
  const gc = await GiftCard.findOne({ code: String(req.params.code).toUpperCase() }).lean();
  if (!gc) throw AppError.notFound("Gift card");
  res.json(gc);
});
commercialRouter.post(
  "/giftcards",
  validate({ body: z.object({ value: z.number().positive(), buyer: objectId.optional(), recipientName: z.string().optional(), recipientPhone: z.string().optional(), message: z.string().optional(), validityDays: z.number().int().positive().optional(), sale: sale.optional() }) }),
  async (req, res) => {
    const gc = await commercial.issueGiftCard({ ...req.body, actor: req.user! });
    await audit(req, { action: "create", entity: "Gift card", entityId: gc._id, summary: `emitió gift card ${gc.code} por ${formatARS(gc.initialValue)}` });
    res.status(201).json(gc);
  },
);
commercialRouter.post("/giftcards/:id/void", async (req, res) => {
  const gc = await GiftCard.findByIdAndUpdate(req.params.id, { status: "void" }, { new: true });
  if (!gc) throw AppError.notFound("Gift card");
  await audit(req, { action: "update", entity: "Gift card", entityId: gc._id, summary: `anuló gift card ${gc.code}` });
  res.json(gc);
});

/* Packs de clientes (bonos) */
commercialRouter.get("/packs", async (req, res) => {
  const { client, status } = req.query as Record<string, string>;
  res.json({ items: await ClientPack.find({ ...(client && { client }), ...(status && { status }) }).populate("client", "name phone").sort({ createdAt: -1 }).limit(300).lean() });
});
commercialRouter.post("/packs", validate({ body: z.object({ plan: objectId, client: objectId, sale: sale.optional() }) }), async (req, res) => {
  const pack = await commercial.issuePack({ ...req.body, actor: req.user! });
  await audit(req, { action: "create", entity: "Bono", entityId: pack._id, summary: `emitió ${pack.name} (${pack.code})` });
  res.status(201).json(pack);
});

/* Membresías de clientes */
commercialRouter.get("/memberships", async (req, res) => {
  const { status } = req.query as Record<string, string>;
  res.json({ items: await Membership.find(status ? { status } : {}).populate("client", "name phone").populate("plan", "name price").sort({ renewsAt: 1 }).lean() });
});
commercialRouter.post("/memberships", validate({ body: z.object({ plan: objectId, client: objectId, payment: sale.optional() }) }), async (req, res) => {
  const m = await commercial.subscribe({ ...req.body, actor: req.user! });
  await audit(req, { action: "create", entity: "Membresía", entityId: m._id, summary: "dio de alta una membresía" });
  res.status(201).json(m);
});
commercialRouter.post("/memberships/:id/renew", validate({ body: sale }), async (req, res) => {
  res.json(await commercial.renewMembership(String(req.params.id), req.body, req.user!));
});
commercialRouter.post("/memberships/:id/status", validate({ body: z.object({ status: z.enum(["active", "paused", "cancelled"]) }) }), async (req, res) => {
  const m = await Membership.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!m) throw AppError.notFound("Membresía");
  await audit(req, { action: "update", entity: "Membresía", entityId: m._id, summary: `cambió membresía a ${req.body.status}` });
  res.json(m);
});
