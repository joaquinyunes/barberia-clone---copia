import { paths } from "@/app/router/paths";
import { Button, Container, Img, Parallax, Reveal, SplitText } from "@/components/ui";
import styles from "./CtaBanner.module.css";

export function CtaBanner({ title = "¿Te toca el corte?", text = "Reservá en un minuto. Elegís sede, barbero y horario, y confirmás por WhatsApp." }: { title?: string; text?: string }) {
  return (
    <section className={styles.banner}>
      <Parallax strength={0.2}>
        <Img src="/images/home/cta-sillon.webp" alt="" />
      </Parallax>
      <div className={styles.overlay} />
      <Container className={styles.inner}>
        <div>
          <SplitText as="h2" text={title} inView />
          <Reveal delay={0.2}><p>{text}</p></Reveal>
        </div>
        <Reveal delay={0.35}>
          <Button to={paths.booking} size="lg">Reservar turno</Button>
        </Reveal>
      </Container>
    </section>
  );
}
