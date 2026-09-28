import { paths } from "@/app/router/paths";
import { Button, Container, Img, Reveal, Section, SectionTitle, SkeletonGrid } from "@/components/ui";
import { PageHero } from "@/features/catalog/PageHero/PageHero";
import { ServiceCard } from "@/features/catalog/ServiceCard/ServiceCard";
import { useServices } from "@/features/catalog/useCatalog";
import styles from "./VipPage.module.css";

const PERKS = [
  { title: "Whisky o café de especialidad", text: "Te recibimos con una medida de single malt o un espresso, como prefieras." },
  { title: "Sin reloj", text: "Los turnos de La Cava tienen margen extra. Nadie te apura para liberar el sillón." },
  { title: "Extras sin cargo", text: "Perfilado de cejas con hilo, cera en orejas o masaje de manos: pedilo y se suma." },
  { title: "Privacidad", text: "Dos sillones, puerta cerrada. Ideal para una charla tranquila o una despedida de soltero." },
];

export default function VipPage() {
  const { data, isLoading } = useServices({ category: "vip" });
  return (
    <>
      <title>La Cava · Salón VIP · Jack el Barbero</title>
      <PageHero eyebrow="Recoleta · Solo con turno" title="La Cava" text="El salón privado de Jack el Barbero, en el subsuelo de la casona de Recoleta." image="/images/vip/cava-hero.webp">
        <Button to={`${paths.booking}?location=recoleta`} size="lg">Reservar un ritual</Button>
      </PageHero>
      <Section>
        <Container className={styles.intro}>
          <Reveal>
            <h2>Bajá la escalera y dejá el ruido arriba</h2>
            <p>
              Ladrillo antiguo, luz cálida, un tocadiscos y dos sillones de cuero. La Cava es donde hacemos los rituales más
              completos: afeitado turco con vapor, máscaras, masajes y todo el tiempo que haga falta.
            </p>
          </Reveal>
          <Reveal delay={0.1}><Img src="/images/vip/cava-sillon.webp" alt="Sillón de barbero de cuero en La Cava" ratio="4 / 3" /></Reveal>
        </Container>
      </Section>
      <Section tone="soft">
        <Container>
          <SectionTitle eyebrow="Beneficios" title="Lo que incluye cada visita" />
          <div className={styles.perks}>
            {PERKS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.06}>
                <article>
                  <span>0{i + 1}</span>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
      <Section>
        <Container>
          <SectionTitle eyebrow="Rituales" title="Tratamientos de La Cava" subtitle="También podés regalarlos con una gift card." />
          {isLoading ? <SkeletonGrid count={2} height={420} /> : (
            <div className={styles.services}>{data?.map((s) => <ServiceCard key={s._id} service={s} />)}</div>
          )}
          <div className={styles.gift}>
            <Button variant="outline" to={paths.shop}>Regalar La Cava</Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
