import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../lib/AppError.js";
import { currentPeriod, monthRange } from "../../lib/dates.js";
import { Appointment } from "../appointments/appointment.model.js";
import { manageToken } from "../appointments/appointment.service.js";
import { Client } from "../clients/client.model.js";
import { ClientPack, GiftCard, Membership } from "../commercial/commercial.models.js";
import * as ledger from "../ledger/ledger.service.js";
import { Goal, Settlement } from "../staff/staff.models.js";
import * as staff from "../staff/staff.service.js";

/** Lo que ve cada persona de sí misma: el barbero su saldo y comisiones; el cliente sus turnos y créditos. */
export const meRouter = Router();
meRouter.use(authenticate);

meRouter.get("/barber", async (req, res) => {
  const barberId = req.user?.barber;
  if (!barberId) throw AppError.forbidden("Tu usuario no está vinculado a un barbero");
  const period = (req.query.period as string) || currentPeriod();
  const { start, end } = monthRange(period);
  const [statement, metrics, goal, settlements, upcoming] = await Promise.all([
    ledger.statement("barber", String(barberId)),
    staff.barberMetrics(barberId, start, end),
    Goal.findOne({ barber: barberId, period }).lean(),
    Settlement.find({ barber: barberId }).sort({ createdAt: -1 }).limit(12).lean(),
    Appointment.find({ barber: barberId, startsAt: { $gte: new Date() }, status: { $in: ["confirmed", "payment_review"] } })
      .populate("client", "name phone cutNotes")
      .populate("service", "name durationMin")
      .sort({ startsAt: 1 })
      .limit(30)
      .lean(),
  ]);
  res.json({ period, ...statement, metrics, goal: goal ? await staff.goalProgress(String(goal._id)) : null, settlements, upcoming });
});

meRouter.post(
  "/barber/settlements/:id/respond",
  validate({ body: z.object({ accept: z.boolean(), note: z.string().optional() }) }),
  async (req, res) => {
    const s = await Settlement.findOne({ _id: req.params.id, barber: req.user?.barber });
    if (!s) throw AppError.notFound("Liquidación");
    if (req.body.accept) s.acceptedAt = new Date();
    else s.disputeNote = req.body.note ?? "Observada por el barbero";
    await s.save();
    res.json(s);
  },
);

meRouter.get("/client", async (req, res) => {
  const client = req.user?.client ? await Client.findById(req.user.client).lean() : null;
  if (!client) throw AppError.forbidden("Tu usuario no tiene ficha de cliente");
  const [account, appointments, membership, packs, giftCards] = await Promise.all([
    ledger.statement("client", String(client._id)),
    Appointment.find({ client: client._id }).populate("service barber location", "name address").sort({ startsAt: -1 }).limit(50).lean({ virtuals: true }),
    Membership.findOne({ client: client._id, status: "active" }).populate("plan").lean(),
    ClientPack.find({ client: client._id, status: "active" }).lean(),
    GiftCard.find({ buyer: client._id }).lean(),
  ]);
  res.json({
    client: { name: client.name, phone: client.phone, email: client.email, tier: client.tier, visits: client.visits, referralCode: client.referralCode, cutNotes: client.cutNotes },
    balance: account.balance,
    movements: account.movements.slice(0, 30),
    appointments: appointments.map((a) => ({ ...a, token: manageToken(a.code), commission: undefined, commissionRule: undefined })),
    membership,
    packs,
    giftCards,
  });
});
