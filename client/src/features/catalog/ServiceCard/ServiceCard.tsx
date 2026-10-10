import { Link } from "react-router-dom";
import { IoTimeOutline } from "react-icons/io5";
import { paths } from "@/app/router/paths";
import { Img } from "@/components/ui";
import type { Service } from "@/types";
import { money } from "@/utils/format";
import styles from "./ServiceCard.module.css";

export function ServiceCard({ service, compact }: { service: Service; compact?: boolean }) {
  return (
    <article className={styles.card}>
      {!compact && (
        <div className={styles.media}>
          <Img src={service.image} alt={service.name} ratio="4 / 3" />
        </div>
      )}
      <div className={styles.body}>
        <div className={styles.head}>
          <h3 data-pump>{service.name}</h3>
          <span className={styles.price} data-pump="center">{money(service.price)}</span>
        </div>
        <p className={styles.meta} data-pump><IoTimeOutline /> {service.durationMin} min</p>
        {service.description && <p className={styles.desc} data-pump data-pump-amount="0.035">{service.description}</p>}
        {service.includes && service.includes.length > 0 && (
          <ul className={styles.includes}>
            {service.includes.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        )}
        <Link to={`${paths.booking}?service=${service._id}`} className={styles.book} data-pump>Reservar este servicio →</Link>
      </div>
    </article>
  );
}
