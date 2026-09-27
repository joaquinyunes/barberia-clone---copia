import { Link } from "react-router-dom";
import { GiRazor, GiScissors, GiShoppingBag, GiPositionMarker } from "react-icons/gi";
import { paths } from "@/app/router/paths";
import { Container, Reveal, Section } from "@/components/ui";
import styles from "./QuickLinks.module.css";

const LINKS = [
  { to: paths.locations, icon: GiPositionMarker, title: "Sedes", text: "Palermo, Recoleta y Microcentro. Encontrá la más cercana." },
  { to: paths.services, icon: GiScissors, title: "Servicios", text: "Cortes, barba, afeitado ritual, color y tratamientos." },
  { to: paths.booking, icon: GiRazor, title: "Reservar", text: "Elegí sede, barbero y horario. Confirmás por WhatsApp." },
  { to: paths.shop, icon: GiShoppingBag, title: "Tienda", text: "Gift cards, packs y productos para seguir el ritual en casa." },
];

export function QuickLinks() {
  return (
    <Section tone="soft">
      <Container className={styles.grid}>
        {LINKS.map((l, i) => (
          <Reveal key={l.to} delay={i * 0.08}>
            <Link to={l.to} className={styles.card}>
              <l.icon size={42} className={styles.icon} />
              <h3>{l.title}</h3>
              <p>{l.text}</p>
              <span className={styles.more}>Ir →</span>
            </Link>
          </Reveal>
        ))}
      </Container>
    </Section>
  );
}
