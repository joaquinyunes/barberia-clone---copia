import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IoChevronBack, IoChevronForward, IoStar } from "react-icons/io5";
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

const EASE = [0.16, 1, 0.3, 1] as const;
const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 70 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -70 }),
};

export function Testimonials() {
  const { index, direction, progress, next, prev, goTo, pause, resume, ref } = useSlider(REVIEWS.length, 7000);
  const r = REVIEWS[index];
  return (
    <Section tone="base">
      <Container narrow className={styles.wrap}>
        <div ref={ref} onMouseEnter={pause} onMouseLeave={resume} aria-roledescription="carrusel" aria-label="Reseñas de clientes">
          <span className={styles.quote} aria-hidden="true">“</span>
          <div className={styles.stage}>
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.blockquote
                key={r.name}
                className={styles.block}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: EASE }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60 || info.velocity.x < -500) next();
                  else if (info.offset.x > 60 || info.velocity.x > 500) prev();
                }}
                data-cursor="Arrastrá"
              >
                <div className={styles.stars} aria-label="5 de 5 estrellas">
                  {Array.from({ length: 5 }, (_, i) => (
                    <IoStar key={i} style={{ "--i": i } as CSSProperties} />
                  ))}
                </div>
                <p>{r.text}</p>
                <footer>{r.name} · <span>{r.place}</span></footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>
          <div className={styles.controls}>
            <button className={styles.arrow} onClick={prev} aria-label="Reseña anterior"><IoChevronBack size={20} /></button>
            <div className={styles.dots}>
              {REVIEWS.map((x, i) => (
                <button key={x.name} className={cx(styles.dot, i === index && styles.active)} onClick={() => goTo(i)} aria-label={`Reseña de ${x.name}`} aria-current={i === index}>
                  {i === index && <motion.span className={styles.fill} style={{ scaleX: progress }} />}
                </button>
              ))}
            </div>
            <button className={styles.arrow} onClick={next} aria-label="Reseña siguiente"><IoChevronForward size={20} /></button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
