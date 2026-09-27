import { Container, Reveal, Section, SectionTitle, SkeletonGrid } from "@/components/ui";
import { LocationCard } from "@/features/catalog/LocationCard/LocationCard";
import { useLocations } from "@/features/catalog/useCatalog";
import styles from "./LocationsPreview.module.css";

export function LocationsPreview() {
  const { data, isLoading } = useLocations();
  return (
    <Section tone="soft">
      <Container>
        <SectionTitle eyebrow="Tres sedes" title="Encontranos en la ciudad" subtitle="Cada sede tiene su personalidad; el oficio es el mismo." />
        {isLoading ? (
          <SkeletonGrid count={3} height={460} />
        ) : (
          <div className={styles.grid}>
            {data?.map((l, i) => (
              <Reveal key={l._id} delay={i * 0.08}>
                <LocationCard location={l} />
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}
