import cron from "node-cron";
import { logger } from "../lib/logger.js";
import { expireHolds } from "../modules/appointments/appointment.service.js";
import { Membership } from "../modules/commercial/commercial.models.js";
import { applyDueInstallments } from "../modules/staff/staff.service.js";
import { Barber } from "../modules/barbers/barber.model.js";

const safe = (name: string, fn: () => Promise<unknown>) => async () => {
  try {
    const r = await fn();
    if (r) logger.info({ job: name, result: r }, "job ejecutado");
  } catch (err) {
    logger.error({ job: name, err }, "falló el job");
  }
};

export function startJobs() {
  // Libera horarios con seña vencida
  cron.schedule("* * * * *", safe("expire-holds", expireHolds));
  // Membresías vencidas sin renovar
  cron.schedule("15 3 * * *", safe("expire-memberships", async () => (await Membership.updateMany({ status: "active", renewsAt: { $lt: new Date() } }, { status: "expired" })).modifiedCount));
  // Cuotas internas vencidas: se descuentan solas del saldo del barbero
  cron.schedule("30 3 * * *", safe("apply-installments", async () => {
    let total = 0;
    for (const b of await Barber.find({}, "_id").lean()) total += await applyDueInstallments(b._id, new Date(), { name: "Sistema" });
    return total;
  }));
}
