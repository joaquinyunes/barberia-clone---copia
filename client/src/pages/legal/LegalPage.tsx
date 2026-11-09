import { useParams } from "react-router-dom";
import { Container, Section } from "@/components/ui";
import styles from "./LegalPage.module.css";

const PAGES: Record<string, { title: string; body: string[] }> = {
  privacidad: {
    title: "Política de privacidad",
    body: [
      "Qué datos guardamos: tu nombre, celular y, si lo dejás, tu email; tus turnos, compras, saldo, puntos y las opiniones que escribas; y los comprobantes de pago que subas. Si creás una cuenta, también tu contraseña (guardada cifrada, nunca en texto).",
      "Para qué los usamos: gestionar tus turnos, cobros y beneficios, avisarte de tu turno y cumplir obligaciones contables. No vendemos ni cedemos tus datos a terceros; los procesan los proveedores que hacen funcionar el servicio (alojamiento, base de datos y, si pagás online, Mercado Pago).",
      "Promociones: solo te escribimos con ofertas si marcaste la casilla al reservar o lo aceptaste en el local. Podés darte de baja cuando quieras desde el link de tu reserva o avisándonos.",
      "Comprobantes: se guardan de forma privada y solo se comparten con la sede mediante un link firmado que vence.",
      "Cuánto tiempo: mientras uses el servicio y el tiempo que la ley exija para registros contables. Las copias de seguridad se conservan hasta 30 días.",
      "Tus derechos (Ley 25.326): podés acceder a tus datos, corregirlos o pedir que los eliminemos escribiéndonos; te entregamos una copia o anonimizamos tu ficha (los importes de ventas se conservan sin tu nombre porque la ley lo exige). Si considerás que no respondimos bien, podés reclamar ante la Agencia de Acceso a la Información Pública (AAIP).",
      "Contacto para estos temas: el que figura en la sede o en security.txt. (BORRADOR: este texto describe cómo funciona el sistema, pero debe ser revisado y completado por un profesional —responsable de la base, domicilio, inscripción— antes de publicarse.)",
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
