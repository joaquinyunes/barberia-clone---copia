import { AppError } from "../../lib/AppError.js";
import { businessDayString } from "../../lib/dates.js";
import { Barber } from "../barbers/barber.model.js";
import { parseCsv } from "../clients/csvImport.js";
import { Location } from "../locations/location.model.js";
import { Service } from "../services/service.model.js";
import * as svc from "./appointment.service.js";

const HEADERS: Record<string, "date" | "time" | "name" | "phone" | "service" | "barber"> = {
  fecha: "date", date: "date", hora: "time", time: "time", nombre: "name", cliente: "name", name: "name",
  telefono: "phone", teléfono: "phone", celular: "phone", phone: "phone", whatsapp: "phone",
  servicio: "service", service: "service", barbero: "barber", barber: "barber", profesional: "barber",
};
const norm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** «2026-11-24» o «24/11/2026» → «2026-11-24»; null si no se entiende. */
function parseDate(s: string) {
  const t = s.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (iso) return t;
  const ar = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  return ar ? `${ar[3]}-${ar[2].padStart(2, "0")}-${ar[1].padStart(2, "0")}` : null;
}

/**
 * Importa los TURNOS FUTUROS de la herramienta anterior (fecha, hora, nombre, teléfono, servicio, barbero).
 * Entran confirmados y sin seña, por el mismo camino que una reserva del panel: respetan horarios, descansos y la regla de doble reserva.
 * El historial (turnos pasados) no se importa: movería caja, saldos y comisiones sin respaldo. Las filas que no entran se informan con su motivo.
 */
export async function importAgenda(csv: string, actor: { name: string }) {
  const rows = parseCsv(csv.replace(/^﻿/, ""));
  if (rows.length < 2) return { created: 0, invalid: [{ line: 1, reason: "El archivo necesita una fila de títulos y al menos un turno" }] };
  const cols = rows[0].map((h) => HEADERS[norm(h)]);
  for (const need of ["date", "time", "name", "phone", "service", "barber"] as const) {
    if (!cols.includes(need)) return { created: 0, invalid: [{ line: 1, reason: "Faltan columnas: se necesitan fecha, hora, nombre, teléfono, servicio y barbero" }] };
  }
  const [services, barbers, locations] = await Promise.all([Service.find({ active: true }).lean(), Barber.find({ status: "active" }).lean(), Location.find({ active: true }).lean()]);
  const today = businessDayString(new Date());
  let created = 0;
  const invalid: { line: number; reason: string }[] = [];
  for (const [i, r] of rows.slice(1, 301).entries()) {
    const line = i + 2;
    const rec: Record<string, string> = {};
    cols.forEach((c, k) => c && (rec[c] = (r[k] ?? "").trim()));
    const date = parseDate(rec.date ?? "");
    const time = /^\d{2}:\d{2}$/.test(rec.time ?? "") ? rec.time : null;
    const service = services.find((s) => norm(s.name) === norm(rec.service ?? ""));
    const barber = barbers.find((b) => norm(b.name) === norm(rec.barber ?? ""));
    const digits = (rec.phone ?? "").replace(/\D/g, "");
    if (!date) invalid.push({ line, reason: "Fecha inválida (usá AAAA-MM-DD o DD/MM/AAAA)" });
    else if (!time) invalid.push({ line, reason: "Hora inválida (usá HH:MM, ej. 09:30)" });
    else if (date < today) invalid.push({ line, reason: "Turno pasado: el historial no se importa" });
    else if ((rec.name ?? "").length < 2) invalid.push({ line, reason: "Falta el nombre" });
    else if (digits.length < 8 || digits.length > 15) invalid.push({ line, reason: "Teléfono inválido" });
    else if (!service) invalid.push({ line, reason: `No existe el servicio «${rec.service}»` });
    else if (!barber) invalid.push({ line, reason: `No existe el barbero «${rec.barber}»` });
    else {
      const location = locations.find((l) => String(l._id) === String(barber.location));
      if (!location) invalid.push({ line, reason: "El barbero no tiene sede activa" });
      else {
        try {
          await svc.createBooking(
            { location: String(location._id), service: String(service._id), barber: String(barber._id), date, time, customer: { name: rec.name, phone: rec.phone }, source: "admin", skipDeposit: true },
            { name: `Importación (${actor.name})` },
          );
          created++;
        } catch (err) {
          invalid.push({ line, reason: err instanceof AppError ? (err.status === 409 ? "El horario no está disponible (ocupado, fuera de horario o descanso)" : err.message) : "No se pudo importar" });
        }
      }
    }
  }
  return { created, invalid: invalid.slice(0, 100) };
}
