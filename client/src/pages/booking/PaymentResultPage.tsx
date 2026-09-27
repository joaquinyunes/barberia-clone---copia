import { useSearchParams } from "react-router-dom";
import { IoAlertCircle, IoCheckmarkCircle, IoTimeOutline } from "react-icons/io5";
import { paths } from "@/app/router/paths";
import { Button, Container, Section } from "@/components/ui";
import styles from "./PaymentResultPage.module.css";

/** Vuelta desde Mercado Pago (back_urls). La confirmación real llega por webhook. */
export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const error = params.get("error");
  const pending = params.get("pending");
  const Icon = error ? IoAlertCircle : pending ? IoTimeOutline : IoCheckmarkCircle;
  return (
    <Section className={styles.page}>
      <Container narrow className={styles.box}>
        <Icon size={64} className={error ? styles.err : styles.ok} />
        <h1>{error ? "El pago no se completó" : pending ? "Pago pendiente" : "¡Pago recibido!"}</h1>
        <p>{error ? "Podés intentar de nuevo o pagar por transferencia." : pending ? "Mercado Pago nos avisará cuando se acredite." : "Tu reserva se confirma automáticamente. Te esperamos."}</p>
        <Button to={paths.home}>Volver al inicio</Button>
      </Container>
    </Section>
  );
}
