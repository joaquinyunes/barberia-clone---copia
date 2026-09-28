import { useMemo, useState } from "react";
import { paths } from "@/app/router/paths";
import { Button, Container, Section, SectionTitle, SkeletonGrid, Tabs } from "@/components/ui";
import { useCartStore } from "@/features/cart/cartStore";
import { PageHero } from "@/features/catalog/PageHero/PageHero";
import { useShop } from "@/features/catalog/useCatalog";
import { ProductCard } from "@/features/shop/ProductCard/ProductCard";
import { money } from "@/utils/format";
import styles from "./ShopPage.module.css";

type Sort = "featured" | "price-asc" | "price-desc";

export default function ShopPage() {
  const { data, isLoading } = useShop();
  const add = useCartStore((s) => s.add);
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState<Sort>("featured");
  const cats = useMemo(() => Array.from(new Set(data?.products.map((p) => p.category).filter(Boolean) as string[])), [data]);
  const products = useMemo(() => {
    const list = data?.products.filter((p) => cat === "all" || p.category === cat) ?? [];
    if (sort === "price-asc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [data, cat, sort]);

  return (
    <>
      <title>Tienda · Gift cards y productos · Jack el Barbero</title>
      <PageHero eyebrow="Tienda" title="Regalos y cuidado en casa" text="Gift cards, packs con descuento y los productos que usamos en el sillón." image="/images/shop/tienda-hero.webp" />
      <Section>
        <Container>
          <div className={styles.toolbar}>
            <Tabs value={cat} onChange={setCat} tabs={[{ value: "all", label: "Todo" }, ...cats.map((c) => ({ value: c, label: c }))]} />
            <label className={styles.sort}>
              Ordenar
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="featured">Destacados</option>
                <option value="price-asc">Menor precio</option>
                <option value="price-desc">Mayor precio</option>
              </select>
            </label>
          </div>
          {isLoading ? <SkeletonGrid count={8} height={340} /> : (
            <div className={styles.grid}>{products.map((p) => <ProductCard key={p._id} product={p} />)}</div>
          )}
        </Container>
      </Section>
      {data && data.packs.length > 0 && (
        <Section tone="soft">
          <Container>
            <SectionTitle eyebrow="Packs" title="Pagás menos por visita" subtitle="Se cargan a tu nombre y los usás en cualquier sede." />
            <div className={styles.packs}>
              {data.packs.map((p) => (
                <article key={p._id} className={styles.pack}>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <ul>{p.items.map((i) => <li key={i.label}>{i.quantity} × {i.label}</li>)}</ul>
                  <strong>{money(p.price)}</strong>
                  <Button block onClick={() => add({ kind: "pack", id: p._id, name: p.name, price: p.price })}>Agregar al carrito</Button>
                </article>
              ))}
            </div>
            <div className={styles.club}>
              <p>¿Venís seguido? El <strong>Club Jack</strong> incluye cortes todos los meses.</p>
              <Button variant="outline" to={paths.club}>Conocer el Club</Button>
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}
