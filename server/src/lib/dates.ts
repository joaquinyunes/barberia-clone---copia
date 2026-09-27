import { env } from "../config/env.js";

/** Convierte fecha (YYYY-MM-DD) + hora (HH:mm) de la zona del negocio a Date (UTC). */
export const toBusinessDate = (date: string, time = "00:00") =>
  new Date(`${date}T${time}:00${env.BUSINESS_UTC_OFFSET}`);

const offsetMinutes = () => {
  const [h, m] = env.BUSINESS_UTC_OFFSET.slice(1).split(":").map(Number);
  return (env.BUSINESS_UTC_OFFSET.startsWith("-") ? -1 : 1) * (h * 60 + m);
};

/** Devuelve la fecha "local del negocio" desplazada, para leer día/hora con getUTC*. */
export const shiftToBusiness = (d: Date) => new Date(d.getTime() + offsetMinutes() * 60_000);

export const businessDayString = (d: Date) => shiftToBusiness(d).toISOString().slice(0, 10);
export const businessTimeString = (d: Date) => shiftToBusiness(d).toISOString().slice(11, 16);
export const businessWeekday = (date: string) => toBusinessDate(date, "12:00").getUTCDay();

export const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const minutesToTime = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const dayRange = (date: string) => ({
  start: toBusinessDate(date, "00:00"),
  end: new Date(toBusinessDate(date, "00:00").getTime() + 86_400_000),
});

/** Rango de un período YYYY-MM en horario del negocio. */
export const monthRange = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { start: toBusinessDate(`${period}-01`), end: toBusinessDate(`${next}-01`) };
};

export const currentPeriod = (d = new Date()) => businessDayString(d).slice(0, 7);

export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

export const formatDateAR = (d: Date) => {
  const s = shiftToBusiness(d);
  return `${String(s.getUTCDate()).padStart(2, "0")}/${String(s.getUTCMonth() + 1).padStart(2, "0")}/${s.getUTCFullYear()}`;
};

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const weekdayName = (d: Date) => WEEKDAYS[shiftToBusiness(d).getUTCDay()];
