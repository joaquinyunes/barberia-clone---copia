import { Link } from "react-router-dom";
import { GiRazor, GiScissors, GiShoppingBag, GiPositionMarker } from "react-icons/gi";
import { paths } from "@/app/router/paths";
import { Container, Img, Reveal, Section } from "@/components/ui";
import styles from "./QuickLinks.module.css";

const LINKS = [
  { to: paths.locations, icon: GiPositionMarker, title: "Sedes", text: "Palermo, Recoleta y Microcentro. Encontrá la más cercana.", image: "/images/home/card-sedes.webp" },
  { to: paths.services, icon: GiScissors, title: "Servicios", text: "Cortes, barba, afeitado ritual, color y tratamientos.", image: "/images/home/card-servicios.webp" },
  { to: paths.booking, icon: GiRazor, title: "Reservar", text: "Elegí sede, barbero y horario. Confirmás por WhatsApp.", image: "/images/home/card-reservar.webp" },
  { to: paths.shop, icon: GiShoppingBag, title: "Tienda", text: "Gift cards, packs y productos para seguir el ritual en casa.", image: "/images/home/card-tienda.webp" },
];

export function QuickLinks() {
  return (
    <Section tone="soft">
      <Container className={styles.grid}>
        {LINKS.map((l, i) => (
          <Reveal key={l.to} delay={i * 0.12} y={60}>
            <Link to={l.to} className={styles.card}>
              <div className={styles.bg}><Img src={l.image} alt="" /></div>
              <div className={styles.shade} />
              <span className={styles.num}>0{i + 1}</span>
              <div className={styles.body}>
                <l.icon size={40} className={styles.icon} />
                <h3>{l.title}</h3>
                <p>{l.text}</p>
                <span className={styles.more}>Ir <i>→</i></span>
              </div>
            </Link>
          </Reveal>
        ))}
      </Container>
    </Section>
  );
}
