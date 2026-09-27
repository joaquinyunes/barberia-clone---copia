import { IoCheckmark } from "react-icons/io5";
import { Button, Container, Reveal, Section, SectionTitle, SkeletonGrid } from "@/components/ui";
import { PageHero } from "@/features/catalog/PageHero/PageHero";
import { useShop, useSite } from "@/features/catalog/useCatalog";
import { money, waHref } from "@/utils/format";
import styles from "./ClubPage.module.css";

const STEPS = [
  { title: "Elegí tu plan", text: "Mensual, sin permanencia. Se paga con Mercado Pago o en la sede." },
  { title: "Reservá con prioridad", text: "Los socios ven horarios reservados antes que nadie." },
  { title: "Usá tus cortes", text: "Tu barbero los descuenta del cupo. El precio queda congelado aunque haya aumentos." },
];

export default function ClubPage() {
  const { data, isLoading } = useShop();
  const { data: site } = useSite();
  return (
    <>
      <title>Club Jack · Membresía mensual · Jack el Barbero</title>
      <PageHero eyebrow="Membresía" title="Club Jack" text="Tus cortes del mes incluidos, precio congelado y prioridad en la agenda." image="/images/club/club-hero.webp" />
      <Section>
        <Container>
          <SectionTitle title="Planes" subtitle="Sin permanencia. Pausalo o cancelalo cuando quieras." />
          {isLoading ? <SkeletonGrid count={2} height={380} /> : (
            <div className={styles.plans}>
              {data?.memberships.map((m, i) => (
                <Reveal key={m._id} delay={i * 0.08}>
                  <article className={i === 0 ? `${styles.plan} ${styles.featured}` : styles.plan}>
                    {i === 0 && <span className={styles.ribbon}>El más elegido</span>}
                    <h3>{m.name}</h3>
                    <p className={styles.price}>{money(m.price)}<small>/mes</small></p>
                    <ul>
                      {m.items.map((it) => <li key={it.label}><IoCheckmark /> {it.quantity} {it.label?.toLowerCase()} por mes</li>)}
                      {m.productDiscountPct ? <li><IoCheckmark /> {m.productDiscountPct}% off en productos</li> : null}
                      {m.priorityBooking && <li><IoCheckmark /> Prioridad en la agenda</li>}
                      {m.priceLock && <li><IoCheckmark /> Precio congelado ante aumentos</li>}
                    </ul>
                    {site && <Button block href={waHref(site.whatsapp, `¡Hola! Quiero sumarme al ${m.name}.`)}>Quiero sumarme</Button>}
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </Container>
      </Section>
      <Section tone="soft">
        <Container>
          <SectionTitle eyebrow="Cómo funciona" title="Tres pasos" />
          <ol className={styles.steps}>
            {STEPS.map((s, i) => (
              <li key={s.title}><span>{i + 1}</span><h3>{s.title}</h3><p>{s.text}</p></li>
            ))}
          </ol>
        </Container>
      </Section>
    </>
  );
}
