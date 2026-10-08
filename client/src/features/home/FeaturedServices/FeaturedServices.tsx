import { paths } from "@/app/router/paths";
import { Button, Container, Reveal, Section, SectionTitle, SkeletonGrid, SnapCarousel } from "@/components/ui";
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
          <Reveal>
            <SnapCarousel className={styles.carousel} label="Servicios destacados">
              {featured?.map((s) => <ServiceCard key={s._id} service={s} />)}
            </SnapCarousel>
          </Reveal>
        )}
        <div className={styles.more}>
          <Button variant="outline" to={paths.services}>Ver todos los servicios</Button>
        </div>
      </Container>
    </Section>
  );
}
