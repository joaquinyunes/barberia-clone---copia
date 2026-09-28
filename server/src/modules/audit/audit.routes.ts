import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { AuditLog } from "./audit.model.js";

export const auditRouter = Router();

auditRouter.get("/", authenticate, authorize("audit.view"), async (req, res) => {
  const { entity, user, page = "1" } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (entity) filter.entity = entity;
  if (user) filter.user = user;
  const limit = 50;
  const skip = (Math.max(1, Number(page)) - 1) * limit;
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
});
