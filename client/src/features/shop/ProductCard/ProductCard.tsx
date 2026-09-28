import { Link } from "react-router-dom";
import { IoBagAddOutline } from "react-icons/io5";
import { paths } from "@/app/router/paths";
import { Badge, Img } from "@/components/ui";
import { useCartStore } from "@/features/cart/cartStore";
import type { Product } from "@/types";
import { money } from "@/utils/format";
import styles from "./ProductCard.module.css";

export function ProductCard({ product }: { product: Product }) {
  const add = useCartStore((s) => s.add);
  const soldOut = product.kind === "sale" && product.stock <= 0;
  return (
    <article className={styles.card}>
      <Link to={paths.product(product.slug ?? product._id)} className={styles.media}>
        <Img src={product.images?.[0]} alt={product.name} ratio="1 / 1" />
        {product.kind === "giftcard" && <span className={styles.tag}>Gift card</span>}
      </Link>
      <div className={styles.body}>
        <span className={styles.cat}>{product.category}</span>
        <h3><Link to={paths.product(product.slug ?? product._id)}>{product.name}</Link></h3>
        <div className={styles.foot}>
          <strong>{money(product.price)}</strong>
          {soldOut ? (
            <Badge>Sin stock</Badge>
          ) : (
            <button className={styles.add} onClick={() => add({ kind: "product", id: product._id, name: product.name, price: product.price, image: product.images?.[0] })} aria-label={`Agregar ${product.name} al carrito`}>
              <IoBagAddOutline size={20} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
