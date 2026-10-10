import { Link } from "react-router-dom";
import { IoLocationOutline, IoLogoWhatsapp } from "react-icons/io5";
import { paths } from "@/app/router/paths";
import { Badge, Img } from "@/components/ui";
import type { Location } from "@/types";
import { waHref } from "@/utils/format";
import { openStatus } from "../hours";
import styles from "./LocationCard.module.css";

export function LocationCard({ location }: { location: Location }) {
  const status = openStatus(location.openingHours);
  return (
    <article className={styles.card}>
      <Link to={paths.location(location.slug)} className={styles.media}>
        <Img src={location.heroImage ?? location.images?.[0]} alt={`Sede ${location.name}`} ratio="3 / 2" />
        {location.isVip && <span className={styles.vip}>La Cava VIP</span>}
      </Link>
      <div className={styles.body}>
        <span className={styles.tagline} data-pump>{location.tagline}</span>
        <h3 data-pump><Link to={paths.location(location.slug)}>{location.name}</Link></h3>
        <p className={styles.address} data-pump><IoLocationOutline /> {location.address}</p>
        <Badge tone={status.open ? "success" : "neutral"}>{status.label}</Badge>
        <div className={styles.actions}>
          <Link to={`${paths.booking}?location=${location.slug}`} className={styles.primary}>Reservar acá</Link>
          <a href={waHref(location.whatsapp)} target="_blank" rel="noopener noreferrer" className={styles.wa} aria-label={`WhatsApp sede ${location.name}`}><IoLogoWhatsapp size={20} /></a>
        </div>
      </div>
    </article>
  );
}
