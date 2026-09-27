import { AnimatePresence, motion } from "framer-motion";
import { IoStar } from "react-icons/io5";
import { Container, Section } from "@/components/ui";
import { cx } from "@/utils/format";
import { useSlider } from "../HeroSlider/useSlider";
import styles from "./Testimonials.module.css";

/** Reseñas de ejemplo: reemplazar por reseñas reales verificadas desde el panel. */
const REVIEWS = [
  { name: "Martín G.", place: "Palermo", text: "Me hicieron el afeitado ritual antes de mi casamiento. Nunca tuve la cara tan suave. Volví con mis amigos." },
  { name: "Federico L.", place: "Microcentro", text: "Salgo de la oficina, 40 minutos y vuelvo impecable. Reservo por la web y me llega todo por WhatsApp." },
  { name: "Joaquín R.", place: "Recoleta", text: "La Cava es otra cosa. Whisky, buena música y un barbero que sabe lo que hace. Vale cada peso." },
  { name: "Agustín D.", place: "Palermo", text: "Lucas se acuerda de cómo me gusta el degradé sin que le explique nada. Eso es lo que buscaba." },
];

export function Testimonials() {
  const { index, setIndex } = useSlider(REVIEWS.length, 7000);
  const r = REVIEWS[index];
  return (
    <Section tone="base">
      <Container narrow className={styles.wrap}>
        <span className={styles.quote} aria-hidden="true">“</span>
        <AnimatePresence mode="wait">
          <motion.blockquote key={r.name} className={styles.block} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.45 }}>
            <div className={styles.stars} aria-label="5 de 5 estrellas">{Array.from({ length: 5 }, (_, i) => <IoStar key={i} />)}</div>
            <p>{r.text}</p>
            <footer>{r.name} · <span>{r.place}</span></footer>
          </motion.blockquote>
        </AnimatePresence>
        <div className={styles.dots}>
          {REVIEWS.map((x, i) => (
            <button key={x.name} className={cx(styles.dot, i === index && styles.active)} onClick={() => setIndex(i)} aria-label={`Reseña de ${x.name}`} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
