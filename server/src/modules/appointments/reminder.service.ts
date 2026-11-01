import { env } from "../../config/env.js";
import { businessTimeString, formatDateAR } from "../../lib/dates.js";
import { logger } from "../../lib/logger.js";
import { notify } from "../../lib/notify/notifier.js";
import { getSettings } from "../settings/settings.model.js";
import { Appointment } from "./appointment.model.js";
import { manageToken } from "./appointment.service.js";

const HOUR = 3_600_000;

/** Recordatorio por turno confirmado que empieza dentro de `reminderHours` (y en más de 1 h). Devuelve cuántos mandó. */
export async function sendDueReminders(now = new Date()) {
  const { reminderHours, businessName } = await getSettings();
  const due = await Appointment.find({
    status: "confirmed",
    reminderSentAt: { $exists: false },
    startsAt: { $gt: new Date(now.getTime() + HOUR), $lte: new Date(now.getTime() + reminderHours * HOUR) },
  })
    .populate("client", "name phone")
    .populate("service location barber", "name");

  let sent = 0;
  for (const a of due) {
    // Se marca antes de enviar para que dos pasadas simultáneas no repitan el aviso.
    const claimed = await Appointment.updateOne({ _id: a._id, reminderSentAt: { $exists: false } }, { reminderSentAt: now });
    if (!claimed.modifiedCount) continue;
    const c = a.client as unknown as { name: string; phone: string };
    const link = `${env.CLIENT_URL}/mi-reserva/${a.code}?token=${encodeURIComponent(manageToken(a.code))}`;
    const text = `¡Hola ${c.name.split(" ")[0]}! 💈 Te recordamos tu turno en ${businessName}: ${(a.service as any).name} con ${(a.barber as any).name}, ${formatDateAR(a.startsAt)} a las ${businessTimeString(a.startsAt)} en ${(a.location as any).name}. Código ${a.code}. Si no podés venir, avisanos acá: ${link}`;
    try {
      await notify({ to: c.phone, text, kind: "reminder" });
      sent++;
    } catch (err) {
      await Appointment.updateOne({ _id: a._id }, { $unset: { reminderSentAt: 1 } }); // se reintenta en la próxima pasada
      logger.warn({ err, code: a.code }, "no se pudo enviar el recordatorio");
    }
  }
  return sent;
}
