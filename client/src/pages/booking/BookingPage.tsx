import { useSearchParams } from "react-router-dom";
import { Container, Section } from "@/components/ui";
import { BookingWizard } from "@/features/booking/BookingWizard/BookingWizard";
import styles from "./BookingPage.module.css";

export default function BookingPage() {
  const [params] = useSearchParams();
  return (
    <Section className={styles.page}>
      <title>Reservar turno · Jack el Barbero</title>
      <Container>
        <header className={styles.head}>
          <span>Reservá en un minuto</span>
          <h1>Reservar turno</h1>
        </header>
        <BookingWizard initialLocation={params.get("location") ?? undefined} initialService={params.get("service") ?? undefined} />
      </Container>
    </Section>
  );
}
