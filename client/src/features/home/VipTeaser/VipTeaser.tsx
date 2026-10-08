import { motion } from "framer-motion";
import { paths } from "@/app/router/paths";
import { Button, Img, Parallax, Reveal, SplitText } from "@/components/ui";
import { EASE_OUT } from "@/components/ui/Motion/easing";
import styles from "./VipTeaser.module.css";

export function VipTeaser() {
  return (
    <section className={styles.vip}>
      <Parallax strength={0.2}>
        <Img src="/images/vip/cava-ambiente.webp" alt="" />
      </Parallax>
      <div className={styles.overlay} />
      <motion.div className={styles.lines} aria-hidden="true" initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 2, ease: EASE_OUT }} />
      <div className={styles.content}>
        <Reveal><span className={styles.eyebrow}>Recoleta · Subsuelo · Solo con turno</span></Reveal>
        <SplitText as="h2" text="La Cava" inView delay={0.15} stagger={0.1} />
        <Reveal delay={0.3}>
          <p>
            Bajás una escalera de hierro y el ruido de la ciudad queda arriba. Sillones Chesterfield, luz baja, un whisky de
            cortesía y dos horas dedicadas a vos. Los rituales más completos de la casa se hacen acá.
          </p>
          <div className={styles.ctas}>
            <Button to={paths.vip} size="lg">Descubrir La Cava</Button>
            <Button to={paths.shop} size="lg" variant="outline">Regalar una experiencia</Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
