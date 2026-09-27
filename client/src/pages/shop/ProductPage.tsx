import { useState } from "react";
import { useParams } from "react-router-dom";
import { IoAdd, IoRemove } from "react-icons/io5";
import { paths } from "@/app/router/paths";
import { Badge, Button, Container, EmptyState, Img, PageLoader, Section, SectionTitle } from "@/components/ui";
import { useCartStore } from "@/features/cart/cartStore";
import { useProduct } from "@/features/catalog/useCatalog";
import { ProductCard } from "@/features/shop/ProductCard/ProductCard";
import { money } from "@/utils/format";
import styles from "./ProductPage.module.css";

export default function ProductPage() {
  const { slug } = useParams();
  const { data: p, isLoading, isError } = useProduct(slug);
  const add = useCartStore((s) => s.add);
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  if (isLoading) return <PageLoader />;
  if (isError || !p) return <Container className={styles.page}><EmptyState title="Producto no encontrado"><Button to={paths.shop}>Volver a la tienda</Button></EmptyState></Container>;
  const soldOut = p.kind === "sale" && p.stock <= 0;
  return (
    <>
      <title>{`${p.name} · Tienda Jack el Barbero`}</title>
      <Section className={styles.page}>
        <Container className={styles.grid}>
          <div className={styles.gallery}>
            <Img src={p.images?.[img]} alt={p.name} ratio="1 / 1" />
            {(p.images?.length ?? 0) > 1 && (
              <div className={styles.thumbs}>
                {p.images!.map((src, i) => (
                  <button key={src} onClick={() => setImg(i)} aria-label={`Imagen ${i + 1}`}><Img src={src} alt="" ratio="1 / 1" /></button>
                ))}
              </div>
            )}
          </div>
          <div className={styles.info}>
            <span className={styles.cat}>{p.category}</span>
            <h1>{p.name}</h1>
            <strong className={styles.price}>{money(p.price)}</strong>
            {p.description && <p className={styles.desc}>{p.description}</p>}
            {p.kind === "giftcard" && <p className={styles.note}>Se envía con un código único por WhatsApp. Podés indicar para quién es al finalizar la compra.</p>}
            {soldOut ? <Badge>Sin stock</Badge> : (
              <div className={styles.buy}>
                <div className={styles.qty}>
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Restar"><IoRemove /></button>
                  <span>{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Sumar"><IoAdd /></button>
                </div>
                <Button size="lg" onClick={() => add({ kind: "product", id: p._id, name: p.name, price: p.price, image: p.images?.[0] }, qty)}>Agregar al carrito</Button>
              </div>
            )}
          </div>
        </Container>
      </Section>
      {p.related && p.related.length > 0 && (
        <Section tone="soft">
          <Container>
            <SectionTitle title="También te puede gustar" />
            <div className={styles.related}>{p.related.map((r) => <ProductCard key={r._id} product={r} />)}</div>
          </Container>
        </Section>
      )}
    </>
  );
}
