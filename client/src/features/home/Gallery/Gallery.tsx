import { motion } from "framer-motion";
import { IoLogoInstagram } from "react-icons/io5";
import { Container, Img, Section, SectionTitle } from "@/components/ui";
import { cx } from "@/utils/format";
import styles from "./Gallery.module.css";

const PHOTOS = [
  { src: "/images/gallery/galeria-1.webp", alt: "Cliente con peinado hacia atrás y barba corta", size: "tall" },
  { src: "/images/gallery/galeria-2.webp", alt: "Brocha, bowl y navajas sobre una toalla" },
  { src: "/images/gallery/galeria-3.webp", alt: "Perfilado a navaja con toalla sobre la frente" },
  { src: "/images/gallery/galeria-4.webp", alt: "Corte con fade bajo y barba", size: "wide" },
  { src: "/images/gallery/galeria-5.webp", alt: "Perfilado de barba con navaja" },
  { src: "/images/gallery/galeria-6.webp", alt: "Brushing de barba con secador", size: "tall" },
  { src: "/images/gallery/galeria-7.webp", alt: "Candado bien marcado en blanco y negro" },
  { src: "/images/gallery/galeria-8.webp", alt: "Barba corta prolija y peinado clásico" },
] as const;

export function Gallery() {
  return (
    <Section tone="base">
      <Container>
        <SectionTitle eyebrow="@jackelbarbero" title="Así se vive la casa" subtitle="Cortes, rituales y momentos de todos los días en nuestras sedes." />
        <div className={styles.grid}>
          {PHOTOS.map((p, i) => (
            <motion.a
              key={p.src}
              href="https://instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={cx(styles.item, "size" in p && styles[p.size])}
              initial={{ opacity: 0, y: 60, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.9, delay: (i % 4) * 0.08, ease: [0.16, 1, 0.3, 1] }}
              aria-label={`${p.alt} (ver en Instagram)`}
            >
              <Img src={p.src} alt={p.alt} />
              <span className={styles.hover} aria-hidden="true"><IoLogoInstagram size={30} /></span>
            </motion.a>
          ))}
        </div>
      </Container>
    </Section>
  );
}
