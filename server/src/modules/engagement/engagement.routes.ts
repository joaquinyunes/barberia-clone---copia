import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../lib/AppError.js";
import { audit } from "../audit/audit.service.js";
import { Client } from "../clients/client.model.js";
import * as engagement from "./engagement.service.js";
import { Review } from "./review.model.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");

export const engagementRouter = Router();
engagementRouter.use(authenticate);

/** Reseñas: ver, ocultar o volver a publicar (el negocio no puede editar el texto ni la nota). */
engagementRouter.get("/reviews", authorize("reports.view"), async (_req, res) => {
  const [items, summary] = await Promise.all([
    Review.find().sort({ createdAt: -1 }).limit(100).populate("barber client", "name").lean(),
    engagement.reviewSummary(),
  ]);
  res.json({ items, summary });
});
engagementRouter.patch("/reviews/:id", authorize("reports.view"), validate({ params: z.object({ id: objectId }), body: z.object({ status: z.enum(["published", "hidden"]) }) }), async (req, res) => {
  const r = await Review.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!r) throw AppError.notFound("Reseña");
  await audit(req, { action: "update", entity: "Reseña", entityId: r._id, summary: `${r.status === "hidden" ? "ocultó" : "publicó"} una reseña` });
  res.json(r);
});

/** Clientes que no vuelven hace N días (por defecto 45). Los links de WhatsApp solo salen para quienes aceptaron campañas. */
engagementRouter.get("/lapsed", authorize("clients.manage"), validate({ query: z.object({ days: z.coerce.number().int().min(7).max(720).default(45) }) }), async (req, res) => {
  const days = (req.query as unknown as { days: number }).days;
  res.json({ days, items: await engagement.lapsedClients(days, (n) => `¡Hola ${n}! 💈 Hace ${days} días que no te vemos. Esta semana tenemos horarios libres: respondé y te reservamos uno. (Para no recibir más mensajes, respondé BAJA.)`) });
});

/** Registrar el consentimiento (o su retiro) que el cliente dio en persona o por WhatsApp. */
engagementRouter.post("/clients/:id/consent", authorize("clients.manage"), validate({ params: z.object({ id: objectId }), body: z.object({ whatsapp: z.boolean().optional(), email: z.boolean().optional() }) }), async (req, res) => {
  if (!(await Client.exists({ _id: req.params.id }))) throw AppError.notFound("Cliente");
  await engagement.setConsent(req.params.id, req.body, `admin:${req.user!.name}`);
  await audit(req, { action: "update", entity: "Cliente", entityId: req.params.id, summary: "registró el consentimiento de campañas", changes: req.body });
  res.status(204).end();
});

engagementRouter.post("/clients/:id/points/redeem", authorize("cash.manage"), validate({ params: z.object({ id: objectId }), body: z.object({ points: z.number().int().positive().max(1_000_000) }) }), async (req, res) => {
  const r = await engagement.redeemPoints(String(req.params.id), req.body.points, req.user!);
  await audit(req, { action: "update", entity: "Cliente", entityId: req.params.id, summary: `canjeó ${req.body.points} puntos por $${r.credited}` });
  res.json(r);
});
