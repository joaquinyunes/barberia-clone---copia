import { Link } from "react-router-dom";
import { IoLogoInstagram, IoLogoTiktok, IoLogoWhatsapp } from "react-icons/io5";
import { paths } from "@/app/router/paths";
import { Container } from "@/components/ui";
import { hoursSummary } from "@/features/catalog/hours";
import { useLocations, useSite } from "@/features/catalog/useCatalog";
import { NewsletterForm } from "@/features/catalog/NewsletterForm";
import { waHref } from "@/utils/format";
import styles from "./Footer.module.css";

export function Footer() {
  const { data: locations } = useLocations();
  const { data: site } = useSite();
  return (
    <footer className={styles.footer}>
      <div className={styles.pole} aria-hidden="true" />
      <Container className={styles.grid}>
        <div className={styles.brand}>
          <img src="/logo.svg" alt="Jack el Barbero" width={220} height={55} />
          <p>Barbería clásica en Buenos Aires. Navaja, tijera y toalla caliente, como siempre, con la agenda de hoy.</p>
          <div className={styles.social}>
            {site && <a href={waHref(site.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><IoLogoWhatsapp size={22} /></a>}
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IoLogoInstagram size={22} /></a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><IoLogoTiktok size={22} /></a>
          </div>
        </div>
        {locations?.map((l) => (
          <div key={l._id} className={styles.col}>
            <h3><Link to={paths.location(l.slug)}>{l.name}</Link></h3>
            <p>{l.address}</p>
            {hoursSummary(l.openingHours).map((h) => (
              <p key={h.days} className={styles.hours}><span>{h.days}</span> {h.label}</p>
            ))}
            <a href={waHref(l.whatsapp)} target="_blank" rel="noopener noreferrer" className={styles.wa}>WhatsApp de la sede</a>
          </div>
        ))}
        <div className={styles.col}>
          <h3>Explorá</h3>
          <Link to={paths.services}>Servicios y precios</Link>
          <Link to={paths.booking}>Reservar turno</Link>
          <Link to={paths.shop}>Gift cards y tienda</Link>
          <Link to={paths.club}>Club Jack</Link>
          <Link to={paths.whyUs}>Por qué nosotros</Link>
          <Link to={paths.contact}>Contacto</Link>
        </div>
      </Container>
      <Container className={styles.newsletter}>
        <div>
          <h3>Novedades y beneficios</h3>
          <p>Promos, nuevos servicios y fechas especiales. Sin spam.</p>
        </div>
        <NewsletterForm />
      </Container>
      <Container className={styles.bottom}>
        <span>© {new Date().getFullYear()} Jack el Barbero. Todos los derechos reservados.</span>
        <nav aria-label="Legales">
          <Link to={paths.legal("privacidad")}>Privacidad</Link>
          <Link to={paths.legal("terminos")}>Términos</Link>
          <Link to={paths.legal("cancelaciones")}>Política de cancelación</Link>
          <Link to={paths.login}>Acceso staff</Link>
        </nav>
      </Container>
    </footer>
  );
}
