import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../lib/AppError.js";
import { ALL_PERMISSIONS, PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS, ROLES, type Permission } from "../../core/permissions.js";
import { audit, diff } from "../audit/audit.service.js";
import { User } from "./user.model.js";

export const usersRouter = Router();
usersRouter.use(authenticate, authorize("users.manage"));

usersRouter.get("/meta", (_req, res) => res.json({ permissions: PERMISSIONS, roles: ROLE_LABELS, rolePermissions: ROLE_PERMISSIONS }));

usersRouter.get("/", async (req, res) => {
  const { role } = req.query as Record<string, string>;
  const items = await User.find(role ? { role } : { role: { $ne: "customer" } }).populate("barber", "name").sort({ name: 1 }).lean();
  res.json({ items: items.map(({ passwordHash, tokenVersion, ...u }) => u) });
});

const base = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(ROLES),
  extraPermissions: z.array(z.enum(ALL_PERMISSIONS as [Permission])).optional(),
  barber: z.string().nullable().optional(),
  locations: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

usersRouter.post("/", validate({ body: base.extend({ password: z.string().min(8) }) }), async (req, res) => {
  const { password, ...data } = req.body;
  const user = await User.create({ ...data, passwordHash: await bcrypt.hash(password, 10) });
  await audit(req, { action: "create", entity: "Usuario", entityId: user._id, summary: `creó el usuario ${user.name} (${ROLE_LABELS[user.role]})` });
  res.status(201).json(user);
});

usersRouter.patch("/:id", validate({ body: base.partial().extend({ password: z.string().min(8).optional() }) }), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw AppError.notFound("Usuario");
  if (String(user._id) === String(req.user!._id) && (req.body.role && req.body.role !== "admin" || req.body.active === false)) {
    throw AppError.badRequest("No podés quitarte a vos mismo el rol de administrador");
  }
  const before = user.toObject();
  const { password, ...data } = req.body;
  user.set(data);
  if (password) {
    user.passwordHash = await bcrypt.hash(password, 10);
    user.tokenVersion += 1;
  }
  if (data.role || data.active === false || data.extraPermissions) user.tokenVersion += data.active === false ? 1 : 0;
  await user.save();
  const changes = diff(before, user.toObject());
  delete (changes as Record<string, unknown>).passwordHash;
  await audit(req, { action: "update", entity: "Usuario", entityId: user._id, summary: `modificó el usuario ${user.name} (${Object.keys(changes).join(", ")})`, changes });
  res.json(user);
});
