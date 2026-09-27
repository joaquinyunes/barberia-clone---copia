import { useParams } from "react-router-dom";
import { Container, Section } from "@/components/ui";
import styles from "./LegalPage.module.css";

const PAGES: Record<string, { title: string; body: string[] }> = {
  privacidad: {
    title: "Política de privacidad",
    body: [
      "Guardamos tu nombre, celular y email únicamente para gestionar tus turnos, compras y beneficios.",
      "Los comprobantes de pago se almacenan de forma privada y solo se comparten con la sede mediante un link firmado que vence.",
      "Podés pedir la baja o corrección de tus datos escribiendo a cualquiera de nuestras sedes. (Texto de ejemplo: revisar con un profesional antes de publicar.)",
    ],
  },
  terminos: {
    title: "Términos y condiciones",
    body: [
      "Los precios publicados son finales y están expresados en pesos argentinos.",
      "Las gift cards tienen 12 meses de validez desde su emisión y no son canjeables por dinero.",
      "(Texto de ejemplo: revisar con un profesional antes de publicar.)",
    ],
  },
  cancelaciones: {
    title: "Política de cancelación",
    body: [
      "Para confirmar un turno pedimos una seña que se descuenta del total del servicio.",
      "Podés cancelar o reprogramar sin costo hasta 12 horas antes. En ese caso la seña queda como saldo a favor para tu próxima visita.",
      "Si cancelás con menos de 12 horas o no te presentás, la seña queda retenida.",
      "Si el turno no se confirma con la seña dentro de los 30 minutos, el horario se libera automáticamente.",
    ],
  },
};

export default function LegalPage() {
  const { slug = "" } = useParams();
  const page = PAGES[slug] ?? PAGES.terminos;
  return (
    <Section className={styles.page}>
      <title>{`${page.title} · Jack el Barbero`}</title>
      <Container narrow>
        <h1>{page.title}</h1>
        {page.body.map((p) => <p key={p}>{p}</p>)}
      </Container>
    </Section>
  );
}
