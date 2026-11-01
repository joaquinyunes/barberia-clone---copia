import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../lib/AppError.js";
import { WAITLIST_STATUSES, WaitlistEntry } from "./waitlist.model.js";

export const waitlistRouter = Router();
waitlistRouter.use(authenticate, authorize("appointments.manage"));

waitlistRouter.get("/", validate({ query: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), status: z.enum(WAITLIST_STATUSES).optional(), location: z.string().optional() }) }), async (req, res) => {
  const q = req.query as Record<string, string>;
  const items = await WaitlistEntry.find({ ...(q.date && { date: q.date }), ...(q.status && { status: q.status }), ...(q.location && { location: q.location }) })
    .populate("client", "name phone")
    .populate("service barber location", "name")
    .sort({ date: 1, createdAt: 1 })
    .limit(500)
    .lean();
  res.json({ items });
});

waitlistRouter.post("/:id/cancel", async (req, res) => {
  const e = await WaitlistEntry.findOneAndUpdate({ _id: req.params.id, status: "waiting" }, { status: "cancelled" }, { new: true });
  if (!e) throw AppError.notFound("Entrada en espera");
  res.json(e);
});
