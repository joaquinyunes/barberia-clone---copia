import { paths } from "@/app/router/paths";
import { Button, Container } from "@/components/ui";
import styles from "./CtaBanner.module.css";

export function CtaBanner({ title = "¿Te toca el corte?", text = "Reservá en un minuto. Elegís sede, barbero y horario, y confirmás por WhatsApp." }: { title?: string; text?: string }) {
  return (
    <section className={styles.banner}>
      <Container className={styles.inner}>
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <Button to={paths.booking} size="lg" variant="dark">Reservar turno</Button>
      </Container>
    </section>
  );
}
