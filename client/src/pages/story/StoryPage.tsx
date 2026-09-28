import { Container, Img, Reveal, Section } from "@/components/ui";
import { CtaBanner } from "@/features/home/CtaBanner/CtaBanner";
import { PageHero } from "@/features/catalog/PageHero/PageHero";
import styles from "./StoryPage.module.css";

const TIMELINE = [
  { year: "El comienzo", text: "Un sillón usado, una navaja heredada y un local de tres por cuatro en Palermo. Los primeros clientes fueron los vecinos de la cuadra." },
  { year: "El oficio", text: "Aprendimos de barberos turcos y porteños de la vieja escuela: toalla caliente, doble pasada y paciencia. Todavía formamos así a cada barbero nuevo." },
  { year: "Recoleta y La Cava", text: "Abrimos la casona de Recoleta y convertimos su sótano en un salón privado. La Cava nació para los rituales que no se pueden apurar." },
  { year: "Microcentro", text: "Para la gente que corre entre reuniones: cortes express de precisión, sin resignar la navaja." },
  { year: "Hoy", text: "Tres sedes, reservas online, tu historial de cortes guardado y el mismo café de siempre esperando." },
];

export default function StoryPage() {
  return (
    <>
      <title>Nuestra historia · Jack el Barbero</title>
      <PageHero eyebrow="Historia" title="De un sillón prestado a tres sedes" text="La historia de Jack el Barbero es la de un oficio que se hereda." image="/images/story/historia-hero.webp" />
      <Section>
        <Container className={styles.intro}>
          <Reveal>
            <Img src="/images/story/fundador.webp" alt="El fundador de Jack el Barbero afeitando a un cliente" ratio="4 / 5" />
          </Reveal>
          <Reveal delay={0.1}>
            <h2>“Jack” era el apodo del abuelo</h2>
            <p>
              Le decían Jack porque nadie en el barrio sabía pronunciar su apellido. Afeitaba a domicilio con una navaja que
              guardaba envuelta en un paño bordó. Esa navaja hoy está colgada en la sede de Palermo.
            </p>
            <p>
              Cuando abrimos la primera barbería quisimos recuperar eso: el trato personal, el ritual sin apuro y el orgullo por
              el trabajo bien hecho. Le sumamos lo que el abuelo no tenía: agenda online, recordatorios y un equipo que se sigue
              formando todos los meses.
            </p>
          </Reveal>
        </Container>
      </Section>
      <Section tone="soft">
        <Container narrow>
          <ol className={styles.timeline}>
            {TIMELINE.map((t, i) => (
              <Reveal key={t.year} delay={i * 0.05}>
                <li>
                  <span>{t.year}</span>
                  <p>{t.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </Container>
      </Section>
      <CtaBanner title="Sentate en el sillón" text="Vení a conocer el ritual en cualquiera de nuestras sedes." />
    </>
  );
}
