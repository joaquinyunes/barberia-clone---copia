import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, DataTable, Stat, Tabs } from "@/components/ui";
import { Money } from "@/features/admin/components/Money/Money";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminQuery } from "@/features/admin/hooks/useAdmin";
import { money } from "@/utils/format";
import styles from "./admin.module.css";

interface Balances {
  clients: { inFavor: number; inFavorCount: number; debt: number; debtCount: number };
  barbers: { toPay: number; toPayCount: number; owesUs: number; owesUsCount: number };
  suppliers: { toPay: number; toPayCount: number };
  giftCards: { liability: number; count: number };
  cash: { total: number; sessions: { location: string; expected: Record<string, number> }[] };
  toCollect: number;
  toPay: number;
}
interface Account { _id: string; balance: number; owner: { _id: string; name: string; phone?: string } }
interface Projection { days: number; cashNow: number; inflow: Record<string, number>; outflow: Record<string, number>; totalIn: number; totalOut: number; projected: number }

type Who = "client" | "barber" | "supplier";

/** "¿Dónde está la plata?" — todo sale de la misma base de movimientos. */
export default function BalancesPage() {
  const navigate = useNavigate();
  const { data } = useAdminQuery<Balances>("reports/balances");
  const { data: proj } = useAdminQuery<Projection>("reports/cash-projection", { days: 30 });
  const [who, setWho] = useState<Who>("client");
  const [sign, setSign] = useState<"negative" | "positive">("negative");

  return (
    <>
      <PageHeader title="Centro de saldos" subtitle="Quién nos debe, a quién le debemos y cuánto hay realmente en caja." />
      <div className={styles.stats}>
        <Stat label="Clientes · nos deben" value={money(data?.clients.debt)} tone="positive" hint={`${data?.clients.debtCount ?? 0} clientes`} onClick={() => { setWho("client"); setSign("negative"); }} />
        <Stat label="Clientes · saldo a favor" value={money(data?.clients.inFavor)} tone="negative" hint={`${data?.clients.inFavorCount ?? 0} clientes (lo debemos en servicios)`} onClick={() => { setWho("client"); setSign("positive"); }} />
        <Stat label="Barberos · por pagar" value={money(data?.barbers.toPay)} tone="negative" hint={`${data?.barbers.toPayCount ?? 0} barberos`} onClick={() => { setWho("barber"); setSign("positive"); }} />
        <Stat label="Barberos · nos deben" value={money(data?.barbers.owesUs)} tone="positive" hint="adelantos/deudas por encima de lo generado" onClick={() => { setWho("barber"); setSign("negative"); }} />
        <Stat label="Proveedores · pendiente" value={money(data?.suppliers.toPay)} tone="negative" hint={`${data?.suppliers.toPayCount ?? 0} proveedores`} onClick={() => { setWho("supplier"); setSign("positive"); }} />
        <Stat label="Gift cards sin usar" value={money(data?.giftCards.liability)} tone="warning" hint={`${data?.giftCards.count ?? 0} activas`} onClick={() => navigate("/admin/gift-cards")} />
        <Stat label="Caja abierta (todas las sedes)" value={money(data?.cash.total)} onClick={() => navigate("/admin/caja")} />
      </div>
      <div className={styles.twoCols}>
        <Card tone="light" title="Cuentas" actions={
          <Tabs value={`${who}:${sign}`} onChange={(v) => { const [w, s] = v.split(":"); setWho(w as Who); setSign(s as "negative"); }} tabs={[
            { value: "client:negative", label: "Clientes deudores" },
            { value: "client:positive", label: "Clientes a favor" },
            { value: "barber:positive", label: "Barberos" },
            { value: "supplier:positive", label: "Proveedores" },
          ]} />
        }>
          <AccountsTable who={who} sign={sign} />
        </Card>
        <Card tone="light" title={`Proyección de caja a ${proj?.days ?? 30} días`}>
          {proj && (
            <>
              <dl className={styles.kv}>
                <dt>Caja hoy</dt><dd>{money(proj.cashNow)}</dd>
                <dt>+ Turnos confirmados ({proj.inflow.appointmentsCount})</dt><dd className={styles.okText}>{money(proj.inflow.appointments)}</dd>
                <dt>+ Renovaciones de membresías</dt><dd className={styles.okText}>{money(proj.inflow.memberships)}</dd>
                <dt>+ Deudas de clientes</dt><dd className={styles.okText}>{money(proj.inflow.clientDebts)}</dd>
                <dt>− Liquidaciones de barberos</dt><dd className={styles.dangerText}>{money(proj.outflow.barbers)}</dd>
                <dt>− Proveedores</dt><dd className={styles.dangerText}>{money(proj.outflow.suppliers)}</dd>
                <dt>− Gastos fijos estimados</dt><dd className={styles.dangerText}>{money(proj.outflow.recurringExpenses)}</dd>
              </dl>
              <p className={styles.total}><span>Saldo proyectado</span><Money value={proj.projected} strong /></p>
              <p className={styles.small}>Estimación con lo que hoy está agendado y los gastos marcados como fijos. Sirve para anticipar si llegás con la caja a fin de mes.</p>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

function AccountsTable({ who, sign }: { who: Who; sign: "positive" | "negative" }) {
  const navigate = useNavigate();
  const { data, isLoading } = useAdminQuery<{ items: Account[] }>("reports/accounts-list", { ownerType: who, sign });
  const link = (a: Account) => (who === "client" ? `/admin/clientes/${a.owner?._id}` : who === "barber" ? `/admin/barberos/${a.owner?._id}` : "/admin/proveedores");
  return (
    <DataTable
      loading={isLoading}
      rows={data?.items}
      rowKey={(a) => a._id}
      onRowClick={(a) => navigate(link(a))}
      empty="No hay cuentas con saldo"
      columns={[
        { key: "n", header: "Nombre", render: (a) => a.owner?.name ?? "—" },
        { key: "b", header: "Saldo", align: "right", render: (a) => <Money value={a.balance} strong /> },
      ]}
    />
  );
}
