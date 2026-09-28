import type { OpeningHours } from "@/types";
import { DAYS } from "@/utils/labels";

const TZ = "America/Argentina/Buenos_Aires";

/** "Abierto ahora · cierra a las 21:00" o "Cerrado · abre mañana 10:00". */
export function openStatus(hours: OpeningHours[], now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const today = hours.find((h) => h.day === day);
  if (today && !today.closed && today.open && today.close && minutes >= toMin(today.open) && minutes < toMin(today.close)) {
    return { open: true, label: `Abierto ahora · cierra ${today.close} h` };
  }
  for (let i = 0; i < 7; i++) {
    const d = (day + i) % 7;
    const h = hours.find((x) => x.day === d);
    if (!h || h.closed || !h.open) continue;
    if (i === 0 && minutes >= toMin(h.open)) continue;
    const when = i === 0 ? "hoy" : i === 1 ? "mañana" : DAYS[d].toLowerCase();
    return { open: false, label: `Cerrado · abre ${when} ${h.open} h` };
  }
  return { open: false, label: "Cerrado" };
}

/** Agrupa días con el mismo horario: "Lun a Sáb 10:00–21:00". */
export function hoursSummary(hours: OpeningHours[]) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows: { days: number[]; label: string }[] = [];
  for (const d of order) {
    const h = hours.find((x) => x.day === d);
    const label = !h || h.closed ? "Cerrado" : `${h.open}–${h.close}`;
    const last = rows[rows.length - 1];
    if (last && last.label === label) last.days.push(d);
    else rows.push({ days: [d], label });
  }
  const short = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return rows.map((r) => ({ days: r.days.length > 1 ? `${short[r.days[0]]} a ${short[r.days[r.days.length - 1]]}` : short[r.days[0]], label: r.label }));
}
