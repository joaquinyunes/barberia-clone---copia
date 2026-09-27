import { paths } from "@/app/router/paths";
import { Button, Container, Section } from "@/components/ui";
import styles from "./NotFoundPage.module.css";

export default function NotFoundPage() {
  return (
    <Section className={styles.page}>
      <title>Página no encontrada · Jack el Barbero</title>
      <Container narrow className={styles.box}>
        <span>404</span>
        <h1>Esta página se fue sin pagar</h1>
        <p>El link está roto o la página ya no existe.</p>
        <Button to={paths.home}>Volver al inicio</Button>
      </Container>
    </Section>
  );
}
