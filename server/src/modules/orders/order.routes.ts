import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../lib/AppError.js";
import { formatARS } from "../../lib/money.js";
import { audit } from "../audit/audit.service.js";
import { PAYMENT_METHODS } from "../settings/settings.model.js";
import { ContactMessage } from "../public/contact.model.js";
import { Order } from "./order.model.js";
import * as orders from "./order.service.js";

export const ordersRouter = Router();
ordersRouter.use(authenticate, authorize("cash.manage", "commercial.manage"));

ordersRouter.get("/", async (req, res) => {
  const { status, code } = req.query as Record<string, string>;
  res.json({ items: await Order.find({ ...(status && { status: { $in: status.split(",") } }), ...(code && { code }) }).populate("client location", "name phone").sort({ createdAt: -1 }).limit(200).lean() });
});
ordersRouter.get("/:id/whatsapp", async (req, res) => res.json(await orders.orderWhatsapp(req.params.id)));
ordersRouter.post("/:id/approve", validate({ body: z.object({ method: z.enum(PAYMENT_METHODS).default("transfer") }) }), async (req, res) => {
  const o = await orders.approveOrder(String(req.params.id), req.body.method, req.user!);
  await audit(req, { action: "update", entity: "Pedido", entityId: o._id, summary: `aprobó el pedido ${o.code} (${formatARS(o.total)})` });
  res.json(o);
});
ordersRouter.post("/:id/cancel", async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o || o.status === "paid") throw AppError.conflict("No se puede cancelar este pedido");
  o.status = "cancelled";
  await o.save();
  await audit(req, { action: "update", entity: "Pedido", entityId: o._id, summary: `canceló el pedido ${o.code}` });
  res.json(o);
});

export const contactAdminRouter = Router();
contactAdminRouter.use(authenticate, authorize("clients.manage"));
contactAdminRouter.get("/", async (_req, res) => res.json({ items: await ContactMessage.find().populate("location", "name").sort({ createdAt: -1 }).limit(200).lean() }));
contactAdminRouter.patch("/:id", async (req, res) => res.json(await ContactMessage.findByIdAndUpdate(req.params.id, { handled: !!req.body?.handled }, { new: true })));
