import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { audit, diff } from "../audit/audit.service.js";
import { PAYMENT_METHODS, getSettings } from "./settings.model.js";

export const settingsRouter = Router();

settingsRouter.get("/", authenticate, async (_req, res) => {
  res.json(await getSettings());
});

const pct = z.number().min(0).max(100);
const nat = z.number().min(0).max(1_000_000_000);
/** Solo se aceptan estos campos y con rangos razonables; lo demás se descarta. */
const settingsBody = z
  .object({
    businessName: z.string().trim().min(1).max(80),
    whatsappMain: z.string().regex(/^[0-9]{8,15}$/),
    paymentMethods: z.array(z.object({ key: z.enum(PAYMENT_METHODS), label: z.string().max(40), feePct: pct, active: z.boolean() })),
    defaultCommissionPct: pct,
    commissionOnNet: z.boolean(),
    advanceMaxPctOfBalance: pct,
    holdMinutes: z.number().int().min(1).max(1440),
    waitlistOfferMinutes: z.number().int().min(1).max(1440),
    reminderHours: z.number().int().min(1).max(168),
    cancellationHours: z.number().int().min(0).max(720),
    slotStepMinutes: z.number().int().min(5).max(120),
    clientCreditLimit: nat,
    referralReward: nat,
    referredDiscountPct: pct,
    overtimeHourRate: nat,
    blindCashClose: z.boolean(),
    tiers: z.array(z.object({ key: z.string().max(30), label: z.string().max(40), minVisits: nat.optional(), minReferrals: nat.optional(), minDaysSinceFirstVisit: nat.optional(), withMembership: z.boolean().optional(), discountPct: pct, benefits: z.string().max(200).optional() })),
    expenseCategories: z.array(z.string().max(40)).max(50),
  })
  .partial();

settingsRouter.patch("/", authenticate, authorize("settings.manage"), validate({ body: settingsBody }), async (req, res) => {
  const s = await getSettings();
  const before = s.toObject();
  const { _id, key, ...data } = req.body ?? {};
  s.set(data);
  await s.save();
  const changes = diff(before, s.toObject());
  await audit(req, { action: "update", entity: "Configuración", summary: `modificó la configuración (${Object.keys(changes).join(", ")})`, changes });
  res.json(s);
});
