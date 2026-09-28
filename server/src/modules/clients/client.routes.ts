import { z } from "zod";
import { crudRouter } from "../../core/crudRouter.js";
import { validate } from "../../middlewares/validate.js";
import { authorize, hasPermission } from "../../middlewares/authorize.js";
import { AppError } from "../../lib/AppError.js";
import { formatARS } from "../../lib/money.js";
import { audit } from "../audit/audit.service.js";
import { AuditLog } from "../audit/audit.model.js";
import { Appointment } from "../appointments/appointment.model.js";
import * as cash from "../cash/cash.service.js";
import { ClientPack, GiftCard, Membership } from "../commercial/commercial.models.js";
import * as ledger from "../ledger/ledger.service.js";
import { PAYMENT_METHODS } from "../settings/settings.model.js";
import { Client, normalizePhone } from "./client.model.js";
import { ensureReferralCode, recomputeTier } from "./client.service.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");

export const clientsRouter = crudRouter({
  model: Client,
  entity: "Cliente",
  permission: "clients.manage",
  schema: z.object({
    name: z.string().min(2),
    phone: z.string().min(6).transform(normalizePhone),
    email: z.string().email().optional().or(z.literal("")),
    dni: z.string().optional(),
    birthday: z.coerce.date().optional(),
    tier: z.string().optional(),
    source: z.string().optional(),
    preferredBarber: objectId.nullable().optional(),
    creditLimit: z.number().min(0).nullable().optional(),
    tags: z.array(z.string()).optional(),
    blocked: z.boolean().optional(),
    active: z.boolean().optional(),
  }),
  searchFields: ["name", "phone", "email", "referralCode"],
  filterFields: ["tier", "source", "active"],
  populate: "preferredBarber",
  sort: { lastVisitAt: -1, createdAt: -1 },
  softDelete: true,
  afterCreate: async (doc) => {
    await ensureReferralCode(doc);
  },
});

/** Ficha 360: turnos, pagos, deuda/saldo, compras, membresía, bonos, gift cards, referidos, notas e historial de cambios. */
clientsRouter.get("/:id/profile", async (req, res) => {
  const client = await Client.findById(req.params.id).populate("preferredBarber referredBy", "name").populate("cutNotes.barber", "name").lean();
  if (!client) throw AppError.notFound("Cliente");
  const [account, appointments, memberships, packs, giftCards, referrals, changes] = await Promise.all([
    ledger.statement("client", String(client._id)),
    Appointment.find({ client: client._id }).populate("service barber location", "name").sort({ startsAt: -1 }).limit(100).lean({ virtuals: true }),
    Membership.find({ client: client._id }).populate("plan", "name price").sort({ createdAt: -1 }).lean(),
    ClientPack.find({ client: client._id }).sort({ createdAt: -1 }).lean(),
    GiftCard.find({ buyer: client._id }).sort({ createdAt: -1 }).lean(),
    Client.find({ referredBy: client._id }, "name visits createdAt").lean(),
    AuditLog.find({ entity: "Cliente", entityId: String(client._id) }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  const completed = appointments.filter((a) => a.status === "completed");
  const barberCount = new Map<string, { name: string; count: number }>();
  for (const a of completed) {
    const b = a.barber as any;
    if (!b) continue;
    const e = barberCount.get(String(b._id)) ?? { name: b.name, count: 0 };
    e.count++;
    barberCount.set(String(b._id), e);
  }
  const canSeeNotes = hasPermission(req, "clients.notes");
  res.json({
    client: canSeeNotes ? client : { ...client, internalNotes: [] },
    account,
    appointments,
    stats: {
      visits: completed.length,
      spent: completed.reduce((s, a) => s + a.total, 0),
      avgTicket: completed.length ? Math.round(completed.reduce((s, a) => s + a.total, 0) / completed.length) : 0,
      noShows: appointments.filter((a) => a.status === "no_show").length,
      cancellations: appointments.filter((a) => a.status === "cancelled").length,
      usualBarber: [...barberCount.values()].sort((a, b) => b.count - a.count)[0]?.name ?? null,
    },
    memberships,
    packs,
    giftCards,
    referrals,
    changes,
  });
});

clientsRouter.post("/:id/notes", authorize("clients.notes"), validate({ body: z.object({ text: z.string().min(2) }) }), async (req, res) => {
  const c = await Client.findByIdAndUpdate(req.params.id, { $push: { internalNotes: { text: req.body.text, by: req.user?.name, at: new Date() } } }, { new: true });
  if (!c) throw AppError.notFound("Cliente");
  await audit(req, { action: "update", entity: "Cliente", entityId: c._id, summary: `agregó una nota interna a ${c.name}` });
  res.status(201).json(c.internalNotes);
});

clientsRouter.post(
  "/:id/cut-notes",
  validate({ body: z.object({ text: z.string().min(2), barber: objectId.optional(), photos: z.array(z.string()).optional() }) }),
  async (req, res) => {
    const c = await Client.findByIdAndUpdate(req.params.id, { $push: { cutNotes: { ...req.body, date: new Date() } } }, { new: true });
    if (!c) throw AppError.notFound("Cliente");
    res.status(201).json(c.cutNotes);
  },
);

/** Cobro de deuda o pago anticipado (queda como saldo a favor). */
clientsRouter.post(
  "/:id/payments",
  authorize("cash.manage"),
  validate({ body: z.object({ amount: z.number().positive(), method: z.enum(PAYMENT_METHODS), location: objectId, concept: z.string().optional() }) }),
  async (req, res) => {
    const client = await Client.findById(req.params.id);
    if (!client) throw AppError.notFound("Cliente");
    const before = await ledger.balanceOf("client", client._id);
    const concept = req.body.concept ?? (before < 0 ? "Pago de deuda" : "Pago anticipado");
    const m = await ledger.post({ ownerType: "client", owner: client._id, type: "payment", amount: req.body.amount, concept, method: req.body.method, location: req.body.location, actor: req.user });
    await cash.record({ location: req.body.location, direction: "in", method: req.body.method, amount: req.body.amount, category: before < 0 ? "debt_payment" : "other", concept: `${concept} — ${client.name}`, party: { kind: "Client", id: client._id, name: client.name }, ref: { kind: "Movement", id: m._id }, actor: req.user });
    await audit(req, { action: "create", entity: "Cliente", entityId: client._id, summary: `registró pago de ${client.name}: ${formatARS(req.body.amount)}` });
    res.status(201).json({ movement: m, balance: m.balanceAfter });
  },
);

/** Crédito a favor sin dinero (devolución, promoción, compensación). */
clientsRouter.post(
  "/:id/credit",
  authorize("finance.manage"),
  validate({ body: z.object({ amount: z.number().refine((n) => n !== 0), concept: z.string().min(3), type: z.enum(["credit", "refund", "adjustment"]).default("credit") }) }),
  async (req, res) => {
    const m = await ledger.post({ ownerType: "client", owner: String(req.params.id), type: req.body.type, amount: req.body.amount, concept: req.body.concept, actor: req.user });
    await audit(req, { action: "create", entity: "Cliente", entityId: req.params.id, summary: `registró ${req.body.concept} (${formatARS(req.body.amount)})` });
    res.status(201).json(m);
  },
);

clientsRouter.post("/:id/recompute-tier", async (req, res) => {
  res.json({ tier: await recomputeTier(req.params.id) });
});
