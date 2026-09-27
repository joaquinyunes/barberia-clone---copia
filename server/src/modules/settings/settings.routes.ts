import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { audit, diff } from "../audit/audit.service.js";
import { getSettings } from "./settings.model.js";

export const settingsRouter = Router();

settingsRouter.get("/", authenticate, async (_req, res) => {
  res.json(await getSettings());
});

settingsRouter.patch("/", authenticate, authorize("settings.manage"), async (req, res) => {
  const s = await getSettings();
  const before = s.toObject();
  const { _id, key, ...data } = req.body ?? {};
  s.set(data);
  await s.save();
  const changes = diff(before, s.toObject());
  await audit(req, { action: "update", entity: "Configuración", summary: `modificó la configuración (${Object.keys(changes).join(", ")})`, changes });
  res.json(s);
});
