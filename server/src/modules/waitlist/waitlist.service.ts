import type { Types } from "mongoose";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/AppError.js";
import { businessDayString, businessTimeString, formatDateAR } from "../../lib/dates.js";
import { logger } from "../../lib/logger.js";
import { notify } from "../../lib/notify/notifier.js";
import * as appointments from "../appointments/appointment.service.js";
import { Client } from "../clients/client.model.js";
import * as clients from "../clients/client.service.js";
import { Location } from "../locations/location.model.js";
import { Service } from "../services/service.model.js";
import { getSettings } from "../settings/settings.model.js";
import { WaitlistEntry } from "./waitlist.model.js";

interface JoinInput {
  location: string;
  service: string;
  barber: string; // id o "any"
  date: string;
  customer: { name: string; phone: string; email?: string };
}

/** Anota al cliente para un día sin horarios libres. Repetir el pedido no duplica la entrada. */
export async function join(input: JoinInput) {
  if (input.date < businessDayString(new Date())) throw AppError.badRequest("Esa fecha ya pasó");
  const av = await appointments.availability({ location: input.location, service: input.service, date: input.date, barber: input.barber });
  if (av.closed) throw AppError.badRequest("La sede está cerrada ese día");
  if (av.slots.length) throw AppError.conflict("Ese día todavía hay horarios libres: reservá directamente.");

  const { client } = await clients.findOrCreate({ ...input.customer, source: "web" });
  const barber = input.barber === "any" ? undefined : input.barber;
  const entry =
    (await WaitlistEntry.findOne({ client: client._id, location: input.location, service: input.service, date: input.date, barber: barber ?? null, status: "waiting" })) ??
    (await WaitlistEntry.create({ client: client._id, location: input.location, service: input.service, date: input.date, barber }));
  const position = await WaitlistEntry.countDocuments({ location: input.location, date: input.date, status: "waiting", createdAt: { $lte: entry.createdAt } });
  return { entry, position };
}

/** La entrada cuyo turno ofrecido se pagó/aprobó pasa a "tomada". */
export const markBooked = (appointment: unknown) => WaitlistEntry.updateOne({ appointment, status: "offered" }, { status: "booked" });

/**
 * Se liberó un horario (cancelación o seña vencida): se lo reserva unos minutos para el primero
 * de la lista que lo pueda usar y se le avisa. Si la oferta anterior venció, se la da por perdida.
 */
export async function onSlotFreed(appt: { _id: Types.ObjectId; location: Types.ObjectId; barber: Types.ObjectId; client: Types.ObjectId; startsAt: Date }) {
  await WaitlistEntry.updateOne({ appointment: appt._id, status: "offered" }, { status: "expired" });

  const date = businessDayString(appt.startsAt);
  const time = businessTimeString(appt.startsAt);
  const waiting = await WaitlistEntry.find({
    location: appt.location,
    date,
    status: "waiting",
    client: { $ne: appt.client }, // quien cancela no recibe su propio horario
    $or: [{ barber: null }, { barber: appt.barber }],
  })
    .sort({ createdAt: 1 })
    .populate<{ client: InstanceType<typeof Client> }>("client");
  if (!waiting.length) return null;

  const settings = await getSettings();
  const location = await Location.findById(appt.location);
  for (const entry of waiting) {
    try {
      const r = await appointments.createBooking({
        location: String(appt.location),
        service: String(entry.service),
        barber: String(appt.barber),
        date,
        time,
        customer: { name: entry.client.name, phone: entry.client.phone },
        source: "web",
        holdMinutes: settings.waitlistOfferMinutes,
      });
      const a = r.appointment;
      entry.status = a.status === "confirmed" ? "booked" : "offered";
      entry.appointment = a._id;
      entry.offeredAt = new Date();
      await entry.save();

      const service = await Service.findById(entry.service);
      const link = `${env.CLIENT_URL}/mi-reserva/${a.code}?token=${encodeURIComponent(appointments.manageToken(a.code))}`;
      const what = `${service?.name ?? "turno"} el ${formatDateAR(a.startsAt)} a las ${time} en ${location?.name ?? "la sede"}`;
      const text =
        a.status === "confirmed"
          ? `¡Hola ${entry.client.name}! 💈 Se liberó un horario y ya quedó reservado a tu nombre: ${what}. Código ${a.code}. Detalle: ${link}`
          : `¡Hola ${entry.client.name}! 💈 Se liberó un horario en ${settings.businessName}: ${what}. Te lo guardamos ${settings.waitlistOfferMinutes} minutos. Confirmalo acá: ${link} (código ${a.code})`;
      await notify({ to: entry.client.phone, text, kind: "waitlist_offer" }).catch((err) => logger.warn({ err }, "no se pudo avisar a la lista de espera"));
      return entry;
    } catch (err) {
      // el horario no le sirve a este cliente (servicio más largo, cliente bloqueado...): se prueba con el siguiente
      logger.info({ err: err instanceof AppError ? err.message : err }, "lista de espera: se salta una entrada");
    }
  }
  return null;
}
