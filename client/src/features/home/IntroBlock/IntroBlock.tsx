import { motion } from "framer-motion";
import { Container, Counter, ImageReveal, Img, Reveal, Section, SplitText } from "@/components/ui";
import { EASE_OUT } from "@/components/ui/Motion/easing";
import styles from "./IntroBlock.module.css";

const FACTS = [
  { value: 3, suffix: "", label: "sedes en Buenos Aires" },
  { value: 40, suffix: "'", label: "promedio por corte, sin apuro" },
  { value: 100, suffix: "%", label: "barberos formados en navaja" },
];

export function IntroBlock() {
  return (
    <Section tone="base">
      <Container className={styles.grid}>
        <div className={styles.media}>
          <ImageReveal className={styles.main}>
            <Img src="/images/home/intro-barbero.webp" alt="Barbero afilando una navaja frente al espejo" ratio="4 / 5" />
          </ImageReveal>
          <ImageReveal className={styles.second} delay={0.4}>
            <Img src="/images/home/intro-detalle.webp" alt="Detalle de navaja, brocha y espuma sobre una toalla" ratio="1 / 1" />
          </ImageReveal>
          <motion.div className={styles.frame} aria-hidden="true" initial={{ opacity: 0, x: 24, y: 24 }} whileInView={{ opacity: 1, x: 0, y: 0 }} viewport={{ once: true }} transition={{ duration: 1.8, delay: 0.7, ease: EASE_OUT }} />
          <motion.div className={styles.badge} initial={{ scale: 0.85, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, delay: 0.9, ease: EASE_OUT }}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <defs><path id="circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" /></defs>
              <text><textPath href="#circle">BARBERÍA CLÁSICA · BUENOS AIRES · </textPath></text>
            </svg>
            <strong>J</strong>
          </motion.div>
        </div>
        <div className={styles.text}>
          <Reveal><span className={styles.eyebrow}>Nuestra forma de trabajar</span></Reveal>
          <SplitText as="h2" text="Oficio antiguo, trato de barrio y agenda del siglo XXI" inView delay={0.1} />
          <Reveal delay={0.25}>
            <p>
              En Jack el Barbero creemos que un buen corte empieza con una charla. Escuchamos, miramos cómo crece tu pelo y recién
              después agarramos la tijera. Trabajamos con navaja recta, toallas calientes y productos elegidos uno por uno.
            </p>
            <p>
              Lo clásico no está peleado con lo práctico: reservás online en un minuto, te llega todo por WhatsApp y tu barbero
              recuerda cómo te gusta el degradé la próxima vez.
            </p>
          </Reveal>
          <dl className={styles.facts}>
            {FACTS.map((f, i) => (
              <Reveal key={f.label} delay={0.35 + i * 0.12}>
                <dt><Counter to={f.value} suffix={f.suffix} /></dt>
                <dd>{f.label}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </Container>
    </Section>
  );
}
