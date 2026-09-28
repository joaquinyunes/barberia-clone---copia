import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { IoCheckmarkCircle } from "react-icons/io5";
import { paths } from "@/app/router/paths";
import { Button, Container, EmptyState, Input, Section, Select, Textarea, toast } from "@/components/ui";
import { PaymentPanel } from "@/features/booking/PaymentPanel/PaymentPanel";
import { cartTotal, useCartStore } from "@/features/cart/cartStore";
import { useLocations } from "@/features/catalog/useCatalog";
import { shopApi, type OrderResult } from "@/features/shop/shop.api";
import { errorMessage } from "@/services/http";
import { money } from "@/utils/format";
import styles from "./CheckoutPage.module.css";

const schema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre"),
  phone: z.string().trim().regex(/^[\d\s+()-]{8,}$/, "Celular inválido"),
  email: z.string().trim().email("Email inválido").or(z.literal("")),
  location: z.string().min(1, "Elegí una sede"),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  message: z.string().max(200).optional(),
});
type Form = z.infer<typeof schema>;

export default function CheckoutPage() {
  const { items, clear } = useCartStore();
  const { data: locations } = useLocations();
  const [order, setOrder] = useState<OrderResult>();
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "", email: "", location: "" } });
  const hasGift = items.some((i) => /gift/i.test(i.name) || i.kind === "pack");

  const create = useMutation({
    mutationFn: (f: Form) =>
      shopApi.createOrder({
        items: items.map((i) => ({ kind: i.kind, id: i.id, qty: i.qty })),
        customer: { name: f.name, phone: f.phone, email: f.email || undefined },
        location: f.location,
        recipient: f.recipientName ? { name: f.recipientName, phone: f.recipientPhone, message: f.message } : undefined,
      }),
    onSuccess: (o) => {
      setOrder(o);
      clear();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (order) {
    return (
      <Section className={styles.page}>
        <Container narrow>
          <div className={styles.success}>
            <IoCheckmarkCircle size={42} />
            <div>
              <h1>Pedido {order.code}</h1>
              <p>Total {money(order.total)}. Completá el pago para que lo preparemos.</p>
            </div>
          </div>
          <PaymentPanel kind="orders" code={order.code} token={order.token} amount={order.total} bank={order.bank} />
        </Container>
      </Section>
    );
  }

  if (!items.length) {
    return (
      <Section className={styles.page}>
        <Container narrow><EmptyState title="Tu carrito está vacío"><Button to={paths.shop}>Ir a la tienda</Button></EmptyState></Container>
      </Section>
    );
  }

  return (
    <Section className={styles.page}>
      <title>Finalizar compra · Jack el Barbero</title>
      <Container className={styles.grid}>
        <form onSubmit={form.handleSubmit((f) => create.mutate(f))} className={styles.form} noValidate>
          <h1>Finalizar compra</h1>
          <Input label="Nombre y apellido" {...form.register("name")} error={form.formState.errors.name?.message} />
          <Input label="Celular (WhatsApp)" type="tel" {...form.register("phone")} error={form.formState.errors.phone?.message} />
          <Input label="Email (opcional)" type="email" {...form.register("email")} error={form.formState.errors.email?.message} />
          <Select label="Sede donde retirás o canjeás" placeholder="Elegí una sede" options={(locations ?? []).map((l) => ({ value: l._id, label: `${l.name} — ${l.address}` }))} {...form.register("location")} error={form.formState.errors.location?.message} />
          {hasGift && (
            <fieldset className={styles.gift}>
              <legend>¿Es un regalo?</legend>
              <Input label="Nombre de quien lo recibe" {...form.register("recipientName")} />
              <Input label="Su celular (opcional)" {...form.register("recipientPhone")} />
              <Textarea label="Mensaje (opcional)" {...form.register("message")} />
            </fieldset>
          )}
          <Button type="submit" size="lg" loading={create.isPending}>Continuar al pago</Button>
        </form>
        <aside className={styles.summary}>
          <h2>Resumen</h2>
          <ul>
            {items.map((i) => (
              <li key={i.id}><span>{i.qty} × {i.name}</span><span>{money(i.qty * i.price)}</span></li>
            ))}
          </ul>
          <p className={styles.total}><span>Total</span><strong>{money(cartTotal(items))}</strong></p>
          <small>Pagás por transferencia (o Mercado Pago) y nos enviás el comprobante por WhatsApp.</small>
        </aside>
      </Container>
    </Section>
  );
}
