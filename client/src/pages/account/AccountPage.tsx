import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { paths } from "@/app/router/paths";
import { Badge, Button, Card, Container, EmptyState, PageLoader, Section, toast } from "@/components/ui";
import { useAuth } from "@/features/auth/useAuth";
import { useShop, useSite } from "@/features/catalog/useCatalog";
import { errorMessage, http } from "@/services/http";
import type { Appointment, Movement } from "@/types";
import { date, longDate, money, signedMoney, time } from "@/utils/format";
import { STATUS_LABELS, STATUS_TONE } from "@/utils/labels";
import styles from "./AccountPage.module.css";

interface MyData {
  client: { name: string; tier: string; visits: number; referralCode?: string; cutNotes: { date: string; text: string }[] };
  balance: number;
  movements: Movement[];
  appointments: (Appointment & { token: string })[];
  membership: { plan: { name: string }; usage: { label: string; total: number; used: number }[]; renewsAt: string } | null;
  packs: { _id: string; code: string; name: string; usage: { label: string; total: number; used: number }[]; expiresAt: string }[];
}

interface LastCut {
  lastCut: { service: { _id: string; name: string }; barber: { name: string }; location: { name: string }; appointment: { startsAt: string }; note?: string } | null;
  suggestions: { date: string; time: string }[];
}

/** «Lo mismo que la última vez»: mismo servicio y barbero, reservado con un toque. */
function RepeatLastCut() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["me-last-cut"], queryFn: () => http.get<LastCut>("/me/client/last-cut").then((r) => r.data) });
  const repeat = useMutation({
    mutationFn: (slot: { date: string; time: string }) => http.post<{ code: string; token: string }>("/me/client/repeat-last-cut", slot).then((r) => r.data),
    onSuccess: (r) => navigate(paths.bookingManage(r.code, r.token)),
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!data?.lastCut) return null;
  const { service, barber, location, appointment, note } = data.lastCut;
  return (
    <Card title="Lo mismo que la última vez">
      <p><strong>{service.name}</strong> con {barber.name} · {location.name} <small>({date(appointment.startsAt)})</small></p>
      {note && <p className={styles.note}>“{note}”</p>}
      {data.suggestions.length === 0 ? <p className={styles.note}>No hay horarios libres en los próximos días: probá reservar desde el asistente.</p> : (
        <div className={styles.headActions}>
          {data.suggestions.map((s) => (
            <Button key={`${s.date}${s.time}`} variant="ghost" disabled={repeat.isPending} onClick={() => repeat.mutate(s)}>{longDate(`${s.date}T${s.time}:00-03:00`)} · {s.time}</Button>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Suscripción con cobro mensual automático (Mercado Pago). Solo se ofrece si el negocio lo tiene activado y la persona no tiene membresía. */
function Subscribe() {
  const { data: site } = useSite();
  const { data: shop } = useShop();
  const go = useMutation({
    mutationFn: (plan: string) => http.post<{ initPoint: string }>("/me/client/membership/checkout", { plan }).then((r) => r.data),
    onSuccess: (r) => window.location.assign(r.initPoint),
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!site?.mercadoPago || !shop?.memberships.length) return null;
  return (
    <Card title="Suscribite a una membresía">
      {shop.memberships.map((m) => (
        <div key={m._id} className={styles.pack}>
          <strong>{m.name}</strong> <small>{money(m.price)} por mes, se cobra solo y podés cancelar cuando quieras</small>
          <div><Button size="sm" loading={go.isPending} onClick={() => go.mutate(m._id)}>Suscribirme</Button></div>
        </div>
      ))}
    </Card>
  );
}

export default function AccountPage() {
  const { user, logout } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["me-client"], queryFn: () => http.get<MyData>("/me/client").then((r) => r.data), enabled: !!user });
  if (isLoading || !data) return <PageLoader />;
  const upcoming = data.appointments.filter((a) => new Date(a.startsAt) > new Date() && !["cancelled", "no_show"].includes(a.status));
  const past = data.appointments.filter((a) => !upcoming.includes(a)).slice(0, 10);
  return (
    <Section className={styles.page}>
      <title>Mi cuenta · Jack el Barbero</title>
      <Container>
        <header className={styles.head}>
          <div>
            <span>Hola,</span>
            <h1>{data.client.name}</h1>
            <Badge tone="gold">Cliente {data.client.tier}</Badge> <small>{data.client.visits} visitas</small>
          </div>
          <div className={styles.headActions}>
            <Button to={paths.booking}>Reservar</Button>
            <Button variant="ghost" onClick={logout}>Salir</Button>
          </div>
        </header>
        <div className={styles.grid}>
          <Card title="Próximos turnos">
            {upcoming.length === 0 ? <EmptyState title="No tenés turnos próximos" /> : upcoming.map((a) => (
              <Link key={a._id} to={paths.bookingManage(a.code, a.token)} className={styles.appt}>
                <div><strong>{a.service.name}</strong><span>{longDate(a.startsAt)} · {time(a.startsAt)} h · {a.location.name}</span></div>
                <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABELS[a.status]}</Badge>
              </Link>
            ))}
          </Card>
          <RepeatLastCut />
          <Card title="Mi saldo">
            <p className={data.balance < 0 ? styles.debt : styles.credit}>{data.balance < 0 ? `Debés ${money(-data.balance)}` : data.balance > 0 ? `${money(data.balance)} a favor` : "Estás al día"}</p>
            <ul className={styles.moves}>
              {data.movements.slice(0, 6).map((m) => <li key={m._id}><span>{date(m.date)} · {m.concept}</span><span>{signedMoney(m.amount)}</span></li>)}
            </ul>
          </Card>
          {!data.membership && <Subscribe />}
          {(data.membership || data.packs.length > 0) && (
            <Card title="Membresía y packs">
              {data.membership && (
                <div className={styles.pack}>
                  <strong>{data.membership.plan.name}</strong> <small>renueva {date(data.membership.renewsAt)}</small>
                  {data.membership.usage.map((u) => <p key={u.label}>{u.label}: {u.used}/{u.total}</p>)}
                </div>
              )}
              {data.packs.map((p) => (
                <div key={p._id} className={styles.pack}>
                  <strong>{p.name}</strong> <small>{p.code} · vence {date(p.expiresAt)}</small>
                  {p.usage.map((u) => <p key={u.label}>{u.label}: quedan {u.total - u.used} de {u.total}</p>)}
                </div>
              ))}
            </Card>
          )}
          <Card title="Invitá amigos">
            <p>Compartí tu código. Tu amigo tiene descuento en su primera visita y vos sumás crédito.</p>
            <p className={styles.code}>{data.client.referralCode}</p>
          </Card>
          {data.client.cutNotes.length > 0 && (
            <Card title="Mis cortes anteriores">
              {data.client.cutNotes.slice(-5).reverse().map((n, i) => <p key={i} className={styles.note}><small>{date(n.date)}</small> {n.text}</p>)}
            </Card>
          )}
          <Card title="Historial">
            {past.map((a) => <p key={a._id} className={styles.note}><small>{date(a.startsAt)}</small> {a.service.name} · {STATUS_LABELS[a.status]}</p>)}
          </Card>
        </div>
      </Container>
    </Section>
  );
}
