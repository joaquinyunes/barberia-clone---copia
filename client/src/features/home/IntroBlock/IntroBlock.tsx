import { Container, Img, Reveal, Section } from "@/components/ui";
import styles from "./IntroBlock.module.css";

const FACTS = [
  { value: "3", label: "sedes en Buenos Aires" },
  { value: "40'", label: "promedio por corte, sin apuro" },
  { value: "100%", label: "barberos formados en navaja" },
];

export function IntroBlock() {
  return (
    <Section tone="base">
      <Container className={styles.grid}>
        <Reveal className={styles.media}>
          <Img src="/images/home/intro-barbero.webp" alt="Barbero afilando una navaja frente al espejo" ratio="4 / 5" />
          <div className={styles.frame} aria-hidden="true" />
        </Reveal>
        <Reveal delay={0.15} className={styles.text}>
          <span className={styles.eyebrow}>Nuestra forma de trabajar</span>
          <h2>Oficio antiguo, trato de barrio y agenda del siglo XXI</h2>
          <p>
            En Jack el Barbero creemos que un buen corte empieza con una charla. Escuchamos, miramos cómo crece tu pelo y recién
            después agarramos la tijera. Trabajamos con navaja recta, toallas calientes y productos elegidos uno por uno.
          </p>
          <p>
            Lo clásico no está peleado con lo práctico: reservás online en un minuto, te llega todo por WhatsApp y tu barbero
            recuerda cómo te gusta el degradé la próxima vez.
          </p>
          <dl className={styles.facts}>
            {FACTS.map((f) => (
              <div key={f.label}>
                <dt>{f.value}</dt>
                <dd>{f.label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Container>
    </Section>
  );
}
