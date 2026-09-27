import { IoCalendarOutline, IoCutOutline, IoLocationOutline, IoPersonOutline } from "react-icons/io5";
import { longDate, money } from "@/utils/format";
import type { Selection } from "../useBookingWizard";
import styles from "./BookingSummary.module.css";

export function BookingSummary({ selection, discount, total }: { selection: Selection; discount?: number; total?: number }) {
  const { location, service, barber, date, time } = selection;
  return (
    <aside className={styles.summary} aria-label="Resumen de tu reserva">
      <h3>Tu reserva</h3>
      <ul>
        <li><IoLocationOutline /><div><span>Sede</span><strong>{location ? location.name : "—"}</strong></div></li>
        <li><IoCutOutline /><div><span>Servicio</span><strong>{service ? `${service.name} · ${service.durationMin} min` : "—"}</strong></div></li>
        <li><IoPersonOutline /><div><span>Barbero</span><strong>{barber ? (barber === "any" ? "Cualquiera disponible" : barber.name) : "—"}</strong></div></li>
        <li><IoCalendarOutline /><div><span>Fecha</span><strong>{date ? `${longDate(`${date}T12:00:00-03:00`)}${time ? ` · ${time} h` : ""}` : "—"}</strong></div></li>
      </ul>
      {service && (
        <div className={styles.total}>
          {discount ? <p className={styles.discount}><span>Descuento</span><span>−{money(discount)}</span></p> : null}
          <p><span>Total</span><strong>{money(total ?? service.price)}</strong></p>
          {location?.depositAmount ? <small>Seña para confirmar: {money(Math.min(location.depositAmount, total ?? service.price))}. El resto se abona en el local.</small> : null}
        </div>
      )}
    </aside>
  );
}
