import { AppError } from "../../lib/AppError.js";
import { addDays, businessDayString } from "../../lib/dates.js";
import { Appointment } from "../appointments/appointment.model.js";
import * as appointments from "../appointments/appointment.service.js";
import { Client } from "./client.model.js";

const SUGGESTIONS = 3;
const DAYS_AHEAD = 14;

/** Último corte completado del cliente: qué se hizo, con quién y la nota del barbero. */
export async function lastCut(clientId: unknown) {
  const appt = await Appointment.findOne({ client: clientId, status: "completed" })
    .sort({ startsAt: -1 })
    .populate("service", "name durationMin price")
    .populate("barber", "name")
    .populate("location", "name");
  if (!appt) return null;
  const client = await Client.findById(clientId, "cutNotes");
  const note = client?.cutNotes.find((n) => String(n.appointment) === String(appt._id))?.text ?? client?.cutNotes.at(-1)?.text;
  return { appointment: { code: appt.code, startsAt: appt.startsAt }, service: appt.service as any, barber: appt.barber as any, location: appt.location as any, note };
}

/** Próximos horarios libres con el mismo servicio y barbero (los primeros que aparezcan). */
export async function suggestSlots(last: NonNullable<Awaited<ReturnType<typeof lastCut>>>) {
  const out: { date: string; time: string }[] = [];
  const today = new Date();
  for (let i = 1; i <= DAYS_AHEAD && out.length < SUGGESTIONS; i++) {
    const date = businessDayString(addDays(today, i));
    const av = await appointments.availability({ location: String(last.location._id), service: String(last.service._id), date, barber: String(last.barber._id) }).catch(() => null);
    if (av?.slots.length) out.push({ date, time: av.slots[0] });
  }
  return out;
}

/** Reserva en un toque: mismo servicio, barbero y sede que la última vez. */
export async function repeat(clientId: unknown, slot: { date: string; time: string }) {
  const last = await lastCut(clientId);
  if (!last) throw AppError.conflict("Todavía no tenés un corte anterior para repetir");
  const client = await Client.findById(clientId);
  if (!client) throw AppError.notFound("Cliente");
  const r = await appointments.createBooking({
    location: String(last.location._id),
    service: String(last.service._id),
    barber: String(last.barber._id),
    ...slot,
    customer: { name: client.name, phone: client.phone, email: client.email ?? undefined },
    notes: last.note ? `Repetir último corte: ${last.note}` : "Repetir último corte",
    source: "web",
  });
  return r.appointment;
}
