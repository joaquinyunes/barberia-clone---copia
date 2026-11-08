import { Router } from "express";
import mongoose from "mongoose";
import { appointmentsRouter } from "../modules/appointments/appointment.routes.js";
import { auditRouter } from "../modules/audit/audit.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { barbersAdminRouter } from "../modules/barbers/barber.routes.js";
import { cashRouter } from "../modules/cash/cash.routes.js";
import { clientsRouter } from "../modules/clients/client.routes.js";
import { commercialRouter, membershipPlansRouter, packPlansRouter, promotionsRouter } from "../modules/commercial/commercial.routes.js";
import { expensesRouter, productsRouter, purchasesRouter, stationsRouter, stockRouter, suppliersRouter, toolsRouter } from "../modules/inventory/inventory.routes.js";
import { ledgerRouter } from "../modules/ledger/ledger.routes.js";
import { locationsAdminRouter } from "../modules/locations/location.routes.js";
import { meRouter } from "../modules/me/me.routes.js";
import { contactAdminRouter, ordersRouter } from "../modules/orders/order.routes.js";
import { publicRouter } from "../modules/public/public.routes.js";
import { reportsRouter } from "../modules/reports/reports.routes.js";
import { servicesAdminRouter } from "../modules/services/service.routes.js";
import { settingsRouter } from "../modules/settings/settings.routes.js";
import { attendanceKioskRouter, staffRouter } from "../modules/staff/staff.routes.js";
import { usersRouter } from "../modules/users/user.routes.js";
import { engagementRouter } from "../modules/engagement/engagement.routes.js";
import { waitlistRouter } from "../modules/waitlist/waitlist.routes.js";

export const api = Router();

// Liveness liviana (sin base): la usa Render y el chequeo de uptime. /health/ready además confirma la conexión a Mongo.
api.get("/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
api.get("/health/ready", async (_req, res) => {
  try {
    await mongoose.connection.db!.admin().ping();
    res.json({ ok: true, db: "up", time: new Date().toISOString() });
  } catch {
    res.status(503).json({ ok: false, db: "down" });
  }
});
api.use("/public", publicRouter);
api.use("/auth", authRouter);
api.use("/me", meRouter);
api.use("/kiosk/attendance", attendanceKioskRouter);

// Administración
api.use("/admin/locations", locationsAdminRouter);
api.use("/admin/services", servicesAdminRouter);
api.use("/admin/barbers", barbersAdminRouter);
api.use("/admin/clients", clientsRouter);
api.use("/admin/appointments", appointmentsRouter);
api.use("/admin/waitlist", waitlistRouter);
api.use("/admin/engagement", engagementRouter);
api.use("/admin/ledger", ledgerRouter);
api.use("/admin/cash", cashRouter);
api.use("/admin/staff", staffRouter);
api.use("/admin/products", productsRouter);
api.use("/admin/stock", stockRouter);
api.use("/admin/suppliers", suppliersRouter);
api.use("/admin/purchases", purchasesRouter);
api.use("/admin/expenses", expensesRouter);
api.use("/admin/tools", toolsRouter);
api.use("/admin/stations", stationsRouter);
api.use("/admin/pack-plans", packPlansRouter);
api.use("/admin/membership-plans", membershipPlansRouter);
api.use("/admin/promotions", promotionsRouter);
api.use("/admin/commercial", commercialRouter);
api.use("/admin/orders", ordersRouter);
api.use("/admin/contact", contactAdminRouter);
api.use("/admin/reports", reportsRouter);
api.use("/admin/users", usersRouter);
api.use("/admin/audit", auditRouter);
api.use("/admin/settings", settingsRouter);
