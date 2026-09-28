import { GiRazor, GiTowel, GiCalendar, GiBrandyBottle, GiMedal, GiSmartphone } from "react-icons/gi";
import { Container, Reveal, Section, SectionTitle } from "@/components/ui";
import { CtaBanner } from "@/features/home/CtaBanner/CtaBanner";
import { PageHero } from "@/features/catalog/PageHero/PageHero";
import styles from "./WhyUsPage.module.css";

const REASONS = [
  { icon: GiRazor, title: "Formación de escuela", text: "Cada barbero pasa meses de práctica con navaja antes de atender solo. No improvisamos con tu cara." },
  { icon: GiTowel, title: "Higiene sin negociar", text: "Cuchillas descartables, toallas lavadas a alta temperatura y herramientas desinfectadas entre cliente y cliente." },
  { icon: GiCalendar, title: "Turno o sin turno", text: "Reservá online en un minuto o pasá: siempre dejamos lugares para quien llega de improviso." },
  { icon: GiSmartphone, title: "Tu historial guardado", text: "Anotamos cómo te cortamos. La próxima vez podés pedir “lo mismo que la última” y listo." },
  { icon: GiBrandyBottle, title: "Una pausa de verdad", text: "Café, cerveza artesanal o un whisky en La Cava. El corte también es un rato para vos." },
  { icon: GiMedal, title: "Precio claro", text: "Precios finales publicados. La seña se descuenta del total y podés cancelar gratis hasta 12 h antes." },
];

export default function WhyUsPage() {
  return (
    <>
      <title>Por qué elegirnos · Jack el Barbero</title>
      <PageHero eyebrow="Por qué nosotros" title="Seis razones para volver" image="/images/whyus/whyus-hero.webp" />
      <Section>
        <Container>
          <SectionTitle title="Lo que no negociamos" subtitle="La diferencia está en los detalles que no se ven en una foto." />
          <div className={styles.grid}>
            {REASONS.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.06}>
                <article className={styles.card}>
                  <r.icon size={40} />
                  <h3>{r.title}</h3>
                  <p>{r.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
      <CtaBanner />
    </>
  );
}
