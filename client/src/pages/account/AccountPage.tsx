import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { paths } from "@/app/router/paths";
import { Badge, Button, Card, Container, EmptyState, PageLoader, Section } from "@/components/ui";
import { useAuth } from "@/features/auth/useAuth";
import { http } from "@/services/http";
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
          <Card title="Mi saldo">
            <p className={data.balance < 0 ? styles.debt : styles.credit}>{data.balance < 0 ? `Debés ${money(-data.balance)}` : data.balance > 0 ? `${money(data.balance)} a favor` : "Estás al día"}</p>
            <ul className={styles.moves}>
              {data.movements.slice(0, 6).map((m) => <li key={m._id}><span>{date(m.date)} · {m.concept}</span><span>{signedMoney(m.amount)}</span></li>)}
            </ul>
          </Card>
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
