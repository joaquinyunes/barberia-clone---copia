import { IoAdd, IoRemove, IoTrashOutline } from "react-icons/io5";
import { paths } from "@/app/router/paths";
import { Button, Drawer, EmptyState, Img } from "@/components/ui";
import { cartTotal, useCartStore } from "@/features/cart/cartStore";
import { money } from "@/utils/format";
import styles from "./CartDrawer.module.css";

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove } = useCartStore();
  const close = () => setOpen(false);
  return (
    <Drawer
      open={open}
      onClose={close}
      title="Tu carrito"
      footer={
        items.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.total}><span>Total</span><strong>{money(cartTotal(items))}</strong></div>
            <Button to={paths.checkout} block size="lg" onClick={close}>Finalizar compra</Button>
          </div>
        )
      }
    >
      {items.length === 0 ? (
        <EmptyState title="Tu carrito está vacío">
          <Button variant="outline" to={paths.shop} onClick={close}>Ver la tienda</Button>
        </EmptyState>
      ) : (
        <ul className={styles.list}>
          {items.map((i) => (
            <li key={i.id} className={styles.item}>
              <div className={styles.thumb}><Img src={i.image} alt={i.name} /></div>
              <div className={styles.info}>
                <strong>{i.name}</strong>
                <span>{money(i.price)}</span>
                <div className={styles.qty}>
                  <button onClick={() => setQty(i.id, i.qty - 1)} aria-label="Restar"><IoRemove /></button>
                  <span>{i.qty}</span>
                  <button onClick={() => setQty(i.id, i.qty + 1)} aria-label="Sumar"><IoAdd /></button>
                </div>
              </div>
              <button className={styles.remove} onClick={() => remove(i.id)} aria-label={`Quitar ${i.name}`}><IoTrashOutline size={18} /></button>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
