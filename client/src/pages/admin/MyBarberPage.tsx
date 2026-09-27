import { Badge, Button, Card, DataTable, Stat } from "@/components/ui";
import { Money } from "@/features/admin/components/Money/Money";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction } from "@/features/admin/hooks/useAdmin";
import { useQuery } from "@tanstack/react-query";
import { http } from "@/services/http";
import type { Movement } from "@/types";
import { date, money, time } from "@/utils/format";
import { MOVEMENT_LABELS } from "@/utils/labels";
import styles from "./admin.module.css";

interface MyBarber {
  balance: number;
  movements: Movement[];
  metrics: { revenue: number; services: number; uniqueClients: number };
  goal: { pct: number; achieved: boolean; bonus: number } | null;
  settlements: { _id: string; label?: string; payout: number; paidAt?: string; acceptedAt?: string; disputeNote?: string; lines?: { label: string; amount: number }[] }[];
  upcoming: { _id: string; startsAt: string; client: { name: string; cutNotes?: { text: string }[] }; service: { name: string } }[];
}

/** Lo que ve el barbero: sus turnos, su saldo, sus comisiones y sus liquidaciones. */
export default function MyBarberPage() {
  const { data } = useQuery({ queryKey: ["admin", "me-barber"], queryFn: () => http.get<MyBarber>("/me/barber").then((r) => r.data) });
  const respond = useAdminAction(({ id, accept, note }: { id: string; accept: boolean; note?: string }) => http.post(`/me/barber/settlements/${id}/respond`, { accept, note }), { success: "Respuesta enviada" });
  if (!data) return null;
  return (
    <>
      <PageHeader title="Mi panel" subtitle="Tu saldo, tus turnos y tus liquidaciones." />
      <div className={styles.stats}>
        <Stat label="Mi saldo" value={<Money value={data.balance} />} tone={data.balance >= 0 ? "positive" : "negative"} hint="Lo que la barbería te debe hoy" />
        <Stat label="Mis ventas del mes" value={money(data.metrics.revenue)} hint={`${data.metrics.services} servicios · ${data.metrics.uniqueClients} clientes`} />
        {data.goal && <Stat label="Mi objetivo" value={`${data.goal.pct}%`} tone={data.goal.achieved ? "positive" : "warning"} hint={data.goal.achieved ? `Bono ${money(data.goal.bonus)}` : "¡Vamos!"} />}
      </div>
      <div className={styles.twoCols}>
        <Card tone="light" title="Próximos turnos" padded={false}>
          <DataTable rows={data.upcoming} rowKey={(a) => a._id} empty="Sin turnos" columns={[
            { key: "d", header: "Cuándo", render: (a) => `${date(a.startsAt)} ${time(a.startsAt)}` },
            { key: "c", header: "Cliente", render: (a) => <>{a.client?.name}{a.client?.cutNotes?.length ? <div className={styles.small}>Último: {a.client.cutNotes[a.client.cutNotes.length - 1].text}</div> : null}</> },
            { key: "s", header: "Servicio", render: (a) => a.service?.name },
          ]} />
        </Card>
        <Card tone="light" title="Mis liquidaciones">
          {data.settlements.map((s) => (
            <div key={s._id} style={{ marginBottom: "1rem" }}>
              <div className={styles.row}><strong>{s.label}</strong><span className={styles.spacer} /><strong>{money(s.payout)}</strong></div>
              <ul className={styles.lines}>{s.lines?.map((l) => <li key={l.label}><span>{l.label}</span><Money value={l.amount} signed /></li>)}</ul>
              {s.acceptedAt ? <Badge tone="success">Aceptada</Badge> : s.disputeNote ? <Badge tone="danger">Observada: {s.disputeNote}</Badge> : (
                <div className={styles.row}>
                  <Button size="sm" onClick={() => respond.mutate({ id: s._id, accept: true })}>Confirmar</Button>
                  <Button size="sm" variant="light" onClick={() => { const note = window.prompt("¿Qué no coincide?"); if (note) respond.mutate({ id: s._id, accept: false, note }); }}>Observar</Button>
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>
      <Card tone="light" title="Mis movimientos" padded={false}>
        <DataTable rows={data.movements.slice(0, 50)} rowKey={(m) => m._id} columns={[
          { key: "d", header: "Fecha", render: (m) => date(m.date) },
          { key: "t", header: "Tipo", render: (m) => MOVEMENT_LABELS[m.type] },
          { key: "c", header: "Concepto", render: (m) => m.concept },
          { key: "a", header: "Monto", align: "right", render: (m) => <Money value={m.amount} signed /> },
          { key: "s", header: "Saldo", align: "right", render: (m) => <Money value={m.balanceAfter} colored={false} /> },
        ]} />
      </Card>
    </>
  );
}
