import { useMemo, useState } from "react";
import { Container, Section, SkeletonGrid, Tabs } from "@/components/ui";
import { PageHero } from "@/features/catalog/PageHero/PageHero";
import { ServiceCard } from "@/features/catalog/ServiceCard/ServiceCard";
import { useServices } from "@/features/catalog/useCatalog";
import { CtaBanner } from "@/features/home/CtaBanner/CtaBanner";
import { CATEGORY_LABELS } from "@/utils/labels";
import styles from "./ServicesPage.module.css";

export default function ServicesPage() {
  const { data, isLoading } = useServices();
  const [cat, setCat] = useState("all");
  const cats = useMemo(() => Array.from(new Set(data?.map((s) => s.category))), [data]);
  const list = data?.filter((s) => cat === "all" || s.category === cat);
  return (
    <>
      <title>Servicios y precios · Jack el Barbero</title>
      <PageHero eyebrow="Carta de servicios" title="Cortes, barba y rituales" text="Precios finales en pesos. La seña se descuenta del total." image="/images/services/servicios-hero.webp" />
      <Section>
        <Container>
          <div className={styles.tabs}>
            <Tabs value={cat} onChange={setCat} tabs={[{ value: "all", label: "Todos" }, ...cats.map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c }))]} />
          </div>
          {isLoading ? <SkeletonGrid count={6} height={420} /> : (
            <div className={styles.grid}>
              {list?.map((s) => <ServiceCard key={s._id} service={s} />)}
            </div>
          )}
        </Container>
      </Section>
      <CtaBanner />
    </>
  );
}
