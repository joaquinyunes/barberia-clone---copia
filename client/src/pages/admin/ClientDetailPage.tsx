import { useState } from "react";
import { useParams } from "react-router-dom";
import { IoLogoWhatsapp } from "react-icons/io5";
import { Badge, Button, Card, DataTable, Input, Modal, PageLoader, Select, Stat, Tabs } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { useAdminStore } from "@/features/admin/adminStore";
import { Money } from "@/features/admin/components/Money/Money";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { Appointment, Movement } from "@/types";
import { date, dateTime, money, phoneDisplay, signedMoney, waHref } from "@/utils/format";
import { METHOD_LABELS, MOVEMENT_LABELS, STATUS_LABELS, STATUS_TONE } from "@/utils/labels";
import styles from "./admin.module.css";

interface Profile {
  client: {
    _id: string; name: string; phone: string; email?: string; tier: string; visits: number; firstVisitAt?: string; lastVisitAt?: string; avgFrequencyDays?: number;
    referralCode?: string; referredBy?: { name: string }; preferredBarber?: { name: string }; source?: string; tags?: string[]; creditLimit?: number;
    internalNotes: { text: string; by: string; at: string }[]; cutNotes: { date: string; text: string; barber?: { name: string } }[];
  };
  account: { balance: number; movements: Movement[] };
  appointments: Appointment[];
  stats: { visits: number; spent: number; avgTicket: number; noShows: number; cancellations: number; usualBarber: string | null };
  memberships: { _id: string; status: string; plan: { name: string }; usage: { label: string; used: number; total: number }[]; renewsAt: string }[];
  packs: { _id: string; code: string; name: string; status: string; usage: { label: string; used: number; total: number }[] }[];
  giftCards: { _id: string; code: string; balance: number; status: string }[];
  referrals: { _id: string; name: string; visits: number }[];
  changes: { _id: string; summary: string; userName: string; createdAt: string }[];
}

export default function ClientDetailPage() {
  const { id = "" } = useParams();
  const { data, isLoading } = useAdminQuery<Profile>(`clients/${id}/profile`);
  const [tab, setTab] = useState("turnos");
  const [paying, setPaying] = useState(false);
  const [note, setNote] = useState("");
  const addNote = useAdminAction(() => adminApi.post(`clients/${id}/notes`, { text: note }), { success: "Nota guardada", onSuccess: () => setNote("") });
  if (isLoading || !data) return <PageLoader />;
  const c = data.client;
  const bal = data.account.balance;
  return (
    <>
      <PageHeader
        title={c.name}
        subtitle={<>{phoneDisplay(c.phone)} · {c.email ?? "sin email"} · cliente desde {date(c.firstVisitAt)} · código <strong>{c.referralCode}</strong></>}
        actions={
          <>
            <Button variant="whatsapp" href={waHref(c.phone, `¡Hola ${c.name.split(" ")[0]}!`)} icon={<IoLogoWhatsapp />}>WhatsApp</Button>
            <Button onClick={() => setPaying(true)}>Registrar pago</Button>
          </>
        }
      />
      <div className={styles.stats}>
        <Stat label="Saldo" value={<Money value={bal} />} tone={bal < 0 ? "negative" : bal > 0 ? "positive" : "neutral"} hint={bal < 0 ? "Debe" : bal > 0 ? "A favor" : "Al día"} />
        <Stat label="Nivel" value={c.tier} hint={`${c.visits} visitas`} />
        <Stat label="Gastado" value={money(data.stats.spent)} hint={`Ticket promedio ${money(data.stats.avgTicket)}`} />
        <Stat label="Frecuencia" value={c.avgFrequencyDays ? `cada ${c.avgFrequencyDays} días` : "—"} hint={`Última: ${date(c.lastVisitAt)}`} />
        <Stat label="Barbero habitual" value={data.stats.usualBarber ?? "—"} />
        <Stat label="Faltas / cancelaciones" value={`${data.stats.noShows} / ${data.stats.cancellations}`} tone={data.stats.noShows > 1 ? "warning" : "neutral"} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: "turnos", label: "Turnos", count: data.appointments.length },
        { value: "cuenta", label: "Cuenta corriente", count: data.account.movements.length },
        { value: "beneficios", label: "Membresía, packs y gift cards" },
        { value: "cortes", label: "Notas de corte", count: c.cutNotes.length },
        { value: "notas", label: "Notas internas", count: c.internalNotes.length },
        { value: "referidos", label: "Referidos", count: data.referrals.length },
        { value: "historial", label: "Historial de cambios" },
      ]} />
      {tab === "turnos" && (
        <DataTable rows={data.appointments} rowKey={(a) => a._id} columns={[
          { key: "d", header: "Fecha", render: (a) => dateTime(a.startsAt) },
          { key: "s", header: "Servicio", render: (a) => a.service?.name },
          { key: "b", header: "Barbero", render: (a) => a.barber?.name, hideOnMobile: true },
          { key: "t", header: "Total", align: "right", render: (a) => money(a.total) },
          { key: "st", header: "Estado", render: (a) => <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABELS[a.status]}</Badge> },
        ]} />
      )}
      {tab === "cuenta" && (
        <DataTable rows={data.account.movements} rowKey={(m) => m._id} columns={[
          { key: "d", header: "Fecha", render: (m) => date(m.date) },
          { key: "t", header: "Tipo", render: (m) => MOVEMENT_LABELS[m.type] ?? m.type },
          { key: "c", header: "Concepto", render: (m) => m.concept },
          { key: "m", header: "Medio", render: (m) => METHOD_LABELS[m.method ?? ""] ?? "—", hideOnMobile: true },
          { key: "a", header: "Monto", align: "right", render: (m) => <Money value={m.amount} signed /> },
          { key: "s", header: "Saldo", align: "right", render: (m) => <Money value={m.balanceAfter} /> },
        ]} />
      )}
      {tab === "beneficios" && (
        <div className={styles.threeCols}>
          <Card tone="light" title="Membresía">
            {data.memberships.length === 0 ? <p className={styles.muted}>Sin membresía</p> : data.memberships.map((m) => (
              <div key={m._id}>
                <strong>{m.plan?.name}</strong> <Badge tone={m.status === "active" ? "success" : "neutral"}>{m.status}</Badge>
                {m.usage.map((u) => <p key={u.label} className={styles.small}>{u.label}: {u.used}/{u.total}</p>)}
                <p className={styles.small}>Renueva {date(m.renewsAt)}</p>
              </div>
            ))}
          </Card>
          <Card tone="light" title="Packs / bonos">
            {data.packs.length === 0 ? <p className={styles.muted}>Sin packs</p> : data.packs.map((p) => (
              <div key={p._id}><strong>{p.name}</strong> <span className={styles.small}>{p.code}</span>{p.usage.map((u) => <p key={u.label} className={styles.small}>{u.label}: usados {u.used} de {u.total}</p>)}</div>
            ))}
          </Card>
          <Card tone="light" title="Gift cards compradas">
            {data.giftCards.length === 0 ? <p className={styles.muted}>Ninguna</p> : data.giftCards.map((g) => <p key={g._id}>{g.code} · {money(g.balance)} · {g.status}</p>)}
          </Card>
        </div>
      )}
      {tab === "cortes" && (
        <Card tone="light">{c.cutNotes.length === 0 ? <p className={styles.muted}>Todavía no hay notas.</p> : [...c.cutNotes].reverse().map((n, i) => <p key={i}><strong>{date(n.date)}</strong> · {n.barber?.name ?? ""} — {n.text}</p>)}</Card>
      )}
      {tab === "notas" && (
        <Card tone="light" title="Notas internas (solo administración)">
          {c.internalNotes.map((n, i) => <p key={i}>• {n.text} <span className={styles.small}>— {n.by}, {date(n.at)}</span></p>)}
          <div className={styles.row}>
            <Input tone="light" placeholder="Ej: siempre paga por transferencia" value={note} onChange={(e) => setNote(e.target.value)} className={styles.spacer} />
            <Button disabled={note.length < 2} loading={addNote.isPending} onClick={() => addNote.mutate(undefined)}>Agregar</Button>
          </div>
        </Card>
      )}
      {tab === "referidos" && (
        <Card tone="light">
          {c.referredBy && <p>Lo recomendó: <strong>{c.referredBy.name}</strong></p>}
          {data.referrals.length === 0 ? <p className={styles.muted}>Todavía no trajo clientes.</p> : data.referrals.map((r) => <p key={r._id}>{r.name} · {r.visits} visitas</p>)}
        </Card>
      )}
      {tab === "historial" && (
        <Card tone="light">{data.changes.length === 0 ? <p className={styles.muted}>Sin cambios registrados.</p> : data.changes.map((ch) => <p key={ch._id} className={styles.small}>{dateTime(ch.createdAt)} · {ch.userName} {ch.summary}</p>)}</Card>
      )}
      {paying && <PaymentModal clientId={c._id} balance={bal} onClose={() => setPaying(false)} />}
    </>
  );
}

function PaymentModal({ clientId, balance, onClose }: { clientId: string; balance: number; onClose: () => void }) {
  const location = useAdminStore((s) => s.location);
  const [amount, setAmount] = useState(balance < 0 ? -balance : 0);
  const [method, setMethod] = useState("cash");
  const pay = useAdminAction(() => adminApi.post<{ balance: number }>(`clients/${clientId}/payments`, { amount, method, location }), {
    success: (r) => `Pago registrado. Nuevo saldo: ${signedMoney(r.balance)}`,
    onSuccess: onClose,
  });
  return (
    <Modal open onClose={onClose} title="Registrar pago del cliente" size="sm" footer={<Button loading={pay.isPending} disabled={!(amount > 0) || !location} onClick={() => pay.mutate(undefined)}>Registrar</Button>}>
      <div className={styles.stack}>
        <p className={styles.muted}>{balance < 0 ? `Debe ${money(-balance)}.` : "Si paga de más, queda como saldo a favor (pago anticipado)."}</p>
        <Input tone="light" label="Monto" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <Select tone="light" label="Medio" value={method} onChange={(e) => setMethod(e.target.value)} options={["cash", "transfer", "mercadopago", "card"].map((m) => ({ value: m, label: METHOD_LABELS[m] }))} />
      </div>
    </Modal>
  );
}
