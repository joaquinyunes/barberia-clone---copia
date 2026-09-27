import { useParams } from "react-router-dom";
import { IoCallOutline, IoCheckmark, IoLocationOutline, IoLogoWhatsapp, IoNavigateOutline } from "react-icons/io5";
import { paths } from "@/app/router/paths";
import { Badge, Button, Container, EmptyState, Img, MapEmbed, mapsLink, PageLoader, Reveal, Section, SectionTitle } from "@/components/ui";
import { hoursSummary, openStatus } from "@/features/catalog/hours";
import { PageHero } from "@/features/catalog/PageHero/PageHero";
import { ServiceCard } from "@/features/catalog/ServiceCard/ServiceCard";
import { useLocation, useServices } from "@/features/catalog/useCatalog";
import { waHref } from "@/utils/format";
import styles from "./LocationDetailPage.module.css";

export default function LocationDetailPage() {
  const { slug } = useParams();
  const { data: loc, isLoading, isError } = useLocation(slug);
  const { data: services } = useServices(loc ? { location: loc._id } : undefined);
  if (isLoading) return <PageLoader />;
  if (isError || !loc) {
    return (
      <Container className={styles.notFound}>
        <EmptyState title="No encontramos esa sede"><Button to={paths.locations}>Ver todas las sedes</Button></EmptyState>
      </Container>
    );
  }
  const status = openStatus(loc.openingHours);
  return (
    <>
      <title>{`Sede ${loc.name} · Jack el Barbero`}</title>
      <PageHero eyebrow={loc.tagline} title={loc.name} text={loc.address} image={loc.heroImage}>
        <div className={styles.heroCtas}>
          <Button to={`${paths.booking}?location=${loc.slug}`} size="lg">Reservar en {loc.name}</Button>
          <Button href={waHref(loc.whatsapp, `¡Hola! Consulta para la sede ${loc.name}.`)} size="lg" variant="whatsapp" icon={<IoLogoWhatsapp />}>WhatsApp</Button>
        </div>
      </PageHero>
      <Section>
        <Container className={styles.grid}>
          <Reveal>
            <h2>La sede</h2>
            <p className={styles.desc}>{loc.description}</p>
            {loc.features && (
              <ul className={styles.features}>
                {loc.features.map((f) => (
                  <li key={f}><IoCheckmark /> {f}</li>
                ))}
              </ul>
            )}
            <div className={styles.gallery}>
              {(loc.images?.length ? loc.images : [undefined, undefined]).map((src, i) => (
                <Img key={i} src={src} alt={`Interior de la sede ${loc.name}`} ratio="4 / 3" />
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <aside className={styles.info}>
              <Badge tone={status.open ? "success" : "neutral"}>{status.label}</Badge>
              <h3>Horarios</h3>
              <dl className={styles.hours}>
                {hoursSummary(loc.openingHours).map((h) => (
                  <div key={h.days}><dt>{h.days}</dt><dd>{h.label}</dd></div>
                ))}
              </dl>
              <h3>Contacto</h3>
              <p><IoLocationOutline /> {loc.address}</p>
              {loc.phone && <p><IoCallOutline /> <a href={`tel:${loc.phone.replace(/\s/g, "")}`}>{loc.phone}</a></p>}
              <p><IoNavigateOutline /> <a href={mapsLink(loc.address + ", Buenos Aires")} target="_blank" rel="noopener noreferrer">Cómo llegar</a></p>
              <MapEmbed title={`Mapa sede ${loc.name}`} query={loc.geo ? `${loc.geo.lat},${loc.geo.lng}` : `${loc.address}, Buenos Aires`} height={240} />
            </aside>
          </Reveal>
        </Container>
      </Section>
      {loc.barbers && loc.barbers.length > 0 && (
        <Section tone="soft">
          <Container>
            <SectionTitle eyebrow="El equipo" title={`Barberos de ${loc.name}`} />
            <div className={styles.team}>
              {loc.barbers.map((b) => (
                <article key={b._id} className={styles.barber}>
                  <Img src={b.photo} alt={b.name} ratio="1 / 1" />
                  <h3>{b.name}</h3>
                  <p>{b.specialties?.join(" · ")}</p>
                  {b.status === "vacation" ? <Badge tone="warning">De vacaciones</Badge> : <Button size="sm" variant="outline" to={`${paths.booking}?location=${loc.slug}`}>Reservar</Button>}
                </article>
              ))}
            </div>
          </Container>
        </Section>
      )}
      <Section>
        <Container>
          <SectionTitle eyebrow="Carta" title="Servicios en esta sede" />
          <div className={styles.services}>
            {services?.map((s) => <ServiceCard key={s._id} service={s} compact />)}
          </div>
        </Container>
      </Section>
    </>
  );
}
