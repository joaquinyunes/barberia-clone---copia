import { Container, MapEmbed, Reveal, Section, SectionTitle, SkeletonGrid } from "@/components/ui";
import { LocationCard } from "@/features/catalog/LocationCard/LocationCard";
import { PageHero } from "@/features/catalog/PageHero/PageHero";
import { useLocations } from "@/features/catalog/useCatalog";
import { CtaBanner } from "@/features/home/CtaBanner/CtaBanner";
import styles from "./LocationsPage.module.css";

export default function LocationsPage() {
  const { data, isLoading } = useLocations();
  return (
    <>
      <title>Sedes · Jack el Barbero</title>
      <PageHero eyebrow="Sedes" title="Tres barberías, un mismo oficio" text="Palermo, Recoleta y Microcentro. Turnos online o pasá sin reservar." image="/images/locations/sedes-hero.webp" />
      <Section>
        <Container>
          {isLoading ? <SkeletonGrid count={3} height={460} /> : (
            <div className={styles.grid}>
              {data?.map((l, i) => (
                <Reveal key={l._id} delay={i * 0.08}><LocationCard location={l} /></Reveal>
              ))}
            </div>
          )}
        </Container>
      </Section>
      <Section tone="soft">
        <Container>
          <SectionTitle eyebrow="Mapa" title="Cómo llegar" />
          <MapEmbed title="Sedes de Jack el Barbero" query="Honduras 4820, Palermo, Buenos Aires" height={420} />
          <p className={styles.note}>¿Querés más detalle? Entrá a cada sede para ver su mapa, horarios y el equipo.</p>
        </Container>
      </Section>
      <CtaBanner />
    </>
  );
}
