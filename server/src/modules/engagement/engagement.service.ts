import { AppError } from "../../lib/AppError.js";
import { waLink } from "../../lib/whatsapp/waLink.js";
import { Appointment } from "../appointments/appointment.model.js";
import { Client } from "../clients/client.model.js";
import * as ledger from "../ledger/ledger.service.js";
import { getSettings } from "../settings/settings.model.js";
import { Review } from "./review.model.js";

/* ── Reseñas verificadas + encuesta ── */

export async function createReview(code: string, input: { rating: number; recommend?: number; comment?: string }) {
  const appt = await Appointment.findOne({ code });
  if (!appt) throw AppError.notFound("Turno");
  if (appt.status !== "completed") throw AppError.conflict("Podés dejar tu opinión cuando el turno ya se realizó");
  try {
    return await Review.create({ appointment: appt._id, barber: appt.barber, client: appt.client, ...input });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw AppError.conflict("Ya dejaste tu opinión sobre este turno. ¡Gracias!");
    throw err;
  }
}

/** Promedio y NPS de las reseñas publicadas (opcionalmente de un barbero). */
export async function reviewSummary(barber?: string) {
  const match = { status: "published", ...(barber ? { barber: new (await import("mongoose")).Types.ObjectId(barber) } : {}) };
  const [agg] = await Review.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        avg: { $avg: "$rating" },
        promoters: { $sum: { $cond: [{ $gte: ["$recommend", 9] }, 1, 0] } },
        detractors: { $sum: { $cond: [{ $and: [{ $ne: ["$recommend", null] }, { $lte: ["$recommend", 6] }] }, 1, 0] } },
        surveyed: { $sum: { $cond: [{ $ne: ["$recommend", null] }, 1, 0] } },
      },
    },
  ]);
  if (!agg) return { count: 0, average: null, nps: null };
  return { count: agg.count, average: Math.round(agg.avg * 10) / 10, nps: agg.surveyed ? Math.round(((agg.promoters - agg.detractors) / agg.surveyed) * 100) : null };
}

/* ── Consentimiento y campañas (Ley 25.326 + normativa anti-spam: solo quien dijo que sí) ── */

export async function setConsent(clientId: unknown, consent: { whatsapp?: boolean; email?: boolean }, source: string) {
  const set: Record<string, unknown> = { "marketing.at": new Date(), "marketing.source": source };
  if (consent.whatsapp !== undefined) set["marketing.whatsapp"] = consent.whatsapp;
  if (consent.email !== undefined) set["marketing.email"] = consent.email;
  await Client.updateOne({ _id: clientId }, { $set: set });
}

/** Clientes que no vuelven hace `days` días (todos, para contacto 1 a 1) y si aceptaron recibir campañas. */
export async function lapsedClients(days: number, message: (name: string) => string) {
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const clients = await Client.find({ active: true, blocked: false, visits: { $gte: 1 }, lastVisitAt: { $lt: cutoff } }).sort({ lastVisitAt: 1 }).limit(300).lean();
  return clients.map((c) => ({
    _id: c._id,
    name: c.name,
    phone: c.phone,
    visits: c.visits,
    lastVisitAt: c.lastVisitAt,
    daysSince: Math.floor((Date.now() - c.lastVisitAt!.getTime()) / 86_400_000),
    consentWhatsapp: !!c.marketing?.whatsapp,
    // El link a WhatsApp de una campaña masiva solo se arma si hay consentimiento.
    whatsapp: c.marketing?.whatsapp ? waLink(c.phone, message(c.name.split(" ")[0])) : null,
  }));
}

/* ── Puntos canjeables ── */

/** Suma puntos por lo realmente cobrado (no por lo cubierto por membresía/pack, que ya se contó al venderlo). */
export async function awardPoints(clientId: unknown, cashValue: number) {
  const s = await getSettings();
  const points = Math.floor((cashValue / 1000) * (s.pointsPerThousand ?? 0));
  if (points > 0) await Client.updateOne({ _id: clientId }, { $inc: { points } });
  return points;
}

/** Canje atómico: descuenta puntos solo si alcanzan y los acredita como saldo a favor. */
export async function redeemPoints(clientId: string, points: number, actor: ledger.Actor) {
  const s = await getSettings();
  const claimed = await Client.findOneAndUpdate({ _id: clientId, points: { $gte: points } }, { $inc: { points: -points } }, { new: true });
  if (!claimed) throw AppError.conflict("No tiene puntos suficientes");
  const amount = points * (s.pointValue ?? 0);
  try {
    await ledger.post({ ownerType: "client", owner: clientId, type: "credit", amount, concept: `Canje de ${points} puntos`, actor });
  } catch (err) {
    await Client.updateOne({ _id: clientId }, { $inc: { points } });
    throw err;
  }
  return { points: claimed.points, credited: amount };
}
