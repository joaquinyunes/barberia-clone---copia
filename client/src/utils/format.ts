const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const TZ = "America/Argentina/Buenos_Aires";

export const money = (n: number | null | undefined) => ars.format(Math.round(n ?? 0));
export const signedMoney = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${ars.format(Math.abs(Math.round(n)))}`;

export const date = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("es-AR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
export const shortDate = (d: string | Date) => new Date(d).toLocaleDateString("es-AR", { timeZone: TZ, day: "2-digit", month: "2-digit" });
export const time = (d: string | Date) => new Date(d).toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
export const dateTime = (d: string | Date | null | undefined) => (d ? `${date(d)} ${time(d)}` : "—");
export const longDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

/** YYYY-MM-DD en la zona horaria del negocio. */
export const isoDay = (d: Date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
export const currentPeriod = () => isoDay().slice(0, 7);
export const addDaysIso = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00-03:00`);
  d.setDate(d.getDate() + days);
  return isoDay(d);
};
export const periodLabel = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const minutesToHours = (m: number) => `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, "0")} min`;

export const phoneDisplay = (digits: string) => (digits ? `+${digits.replace(/^(\d{2})(\d)(\d{2})(\d{4})(\d{4})$/, "$1 $2 $3 $4-$5")}` : "");
export const waHref = (digits: string, text?: string) => `https://wa.me/${digits.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
