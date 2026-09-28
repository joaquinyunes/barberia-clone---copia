import { paths } from "@/app/router/paths";
import { Button, Container, Reveal, Section, SectionTitle, SkeletonGrid } from "@/components/ui";
import { ServiceCard } from "@/features/catalog/ServiceCard/ServiceCard";
import { useServices } from "@/features/catalog/useCatalog";
import styles from "./FeaturedServices.module.css";

export function FeaturedServices() {
  const { data, isLoading } = useServices();
  const featured = data?.filter((s) => s.featured && s.category !== "vip").slice(0, 4);
  return (
    <Section tone="base">
      <Container>
        <SectionTitle eyebrow="Lo más pedido" title="Servicios de la casa" subtitle="Precios finales, sin sorpresas. Todos incluyen lavado y terminación con producto." />
        {isLoading ? (
          <SkeletonGrid count={4} height={420} />
        ) : (
          <div className={styles.grid}>
            {featured?.map((s, i) => (
              <Reveal key={s._id} delay={i * 0.07}>
                <ServiceCard service={s} />
              </Reveal>
            ))}
          </div>
        )}
        <div className={styles.more}>
          <Button variant="outline" to={paths.services}>Ver todos los servicios</Button>
        </div>
      </Container>
    </Section>
  );
}
