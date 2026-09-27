import { useState } from "react";
import { IoLogoWhatsapp } from "react-icons/io5";
import { Badge, Button, Card, DataTable, Select } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { useAdminStore } from "@/features/admin/adminStore";
import { Money } from "@/features/admin/components/Money/Money";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { Paged } from "@/types";
import { currentPeriod, date, money, periodLabel, waHref } from "@/utils/format";
import { METHOD_LABELS } from "@/utils/labels";
import styles from "./admin.module.css";

interface Preview {
  barber: { _id: string; name: string };
  sales: { revenue: number; services: number };
  lines: { label: string; amount: number }[];
  pending: { label: string; amount: number }[];
  balance: number;
  total: number;
}
interface Settlement { _id: string; barber?: { name: string }; label?: string; payout: number; paidAt?: string; method?: string; status: string; acceptedAt?: string; disputeNote?: string; salesTotal?: number; lines?: { label: string; amount: number }[] }

/** Arma el pago del barbero: lo del período + lo que se aplica al cerrar (cuotas, bono, horas extra). */
export function SettlementPanel({ barberId, history }: { barberId: string; history?: Settlement[] }) {
  const location = useAdminStore((s) => s.location);
  const [period, setPeriod] = useState(currentPeriod());
  const [method, setMethod] = useState("transfer");
  const [p, setP] = useState<Preview>();
  const load = useAdminAction(() => adminApi.post<Preview>("staff/settlements/preview", { barber: barberId, period }), { onSuccess: setP });
  const close = useAdminAction(() => adminApi.post<Settlement>("staff/settlements", { barber: barberId, period, label: periodLabel(period), method, location: location || undefined }), {
    success: (s) => `Liquidación cerrada: ${money(s.payout)}`,
    onSuccess: () => setP(undefined),
  });
  const receipt = (s: Settlement) =>
    [`💈 Liquidación ${s.label ?? ""} – Jack el Barbero`, "", ...(s.lines ?? []).map((l) => `${l.label}: ${money(l.amount)}`), "", `TOTAL PAGADO: ${money(s.payout)} (${METHOD_LABELS[s.method ?? ""] ?? s.method})`].join("\n");

  return (
    <div className={styles.twoCols}>
      <Card tone="light" title="Nueva liquidación" actions={
        <>
          <input type="month" className={styles.month} value={period} onChange={(e) => { setPeriod(e.target.value); setP(undefined); }} aria-label="Período" />
          <Button size="sm" variant="light" loading={load.isPending} onClick={() => load.mutate(undefined)}>Calcular</Button>
        </>
      }>
        {!p ? <p className={styles.muted}>Elegí el período y tocá “Calcular”.</p> : (
          <div className={styles.stack}>
            <p className={styles.muted}>Ventas del período: <strong>{money(p.sales.revenue)}</strong> · {p.sales.services} servicios</p>
            <ul className={styles.lines}>
              {p.lines.map((l) => <li key={l.label}><span>{l.label}</span><Money value={l.amount} signed /></li>)}
            </ul>
            {p.pending.length > 0 && (
              <>
                <h4>Se aplica al cerrar</h4>
                <ul className={styles.lines}>{p.pending.map((l) => <li key={l.label}><span>{l.label}</span><Money value={l.amount} signed /></li>)}</ul>
              </>
            )}
            <p className={styles.total}><span>TOTAL A PAGAR</span><span>{money(Math.max(0, p.total))}</span></p>
            {p.total < 0 && <p className={styles.dangerText}>El saldo es negativo: no se paga nada y la diferencia pasa al próximo período.</p>}
            <div className={styles.row}>
              <Select tone="light" value={method} onChange={(e) => setMethod(e.target.value)} options={["cash", "transfer", "mercadopago"].map((m) => ({ value: m, label: METHOD_LABELS[m] }))} />
              <Button loading={close.isPending} onClick={() => window.confirm("¿Cerrar la liquidación y registrar el pago?") && close.mutate(undefined)}>Cerrar liquidación</Button>
            </div>
          </div>
        )}
      </Card>
      {history && (
        <Card tone="light" title="Historial de liquidaciones" padded={false}>
          <DataTable rows={history} rowKey={(s) => s._id} empty="Sin liquidaciones" columns={[
            { key: "l", header: "Período", render: (s) => s.label ?? "—" },
            { key: "p", header: "Pagado", align: "right", render: (s) => money(s.payout) },
            { key: "d", header: "Fecha", render: (s) => date(s.paidAt), hideOnMobile: true },
            { key: "m", header: "Medio", render: (s) => METHOD_LABELS[s.method ?? ""] ?? "—", hideOnMobile: true },
            { key: "s", header: "Estado", render: (s) => (s.disputeNote ? <Badge tone="danger">Observada</Badge> : s.acceptedAt ? <Badge tone="success">✓ Aceptada</Badge> : <Badge tone={s.status === "paid" ? "info" : "neutral"}>{s.status === "paid" ? "Pagada" : "Arrastre"}</Badge>) },
            { key: "w", header: "", render: (s) => <Button size="sm" variant="ghost" href={waHref("", receipt(s))} icon={<IoLogoWhatsapp />}>Recibo</Button> },
          ]} />
        </Card>
      )}
    </div>
  );
}

export default function SettlementsPage() {
  const [barber, setBarber] = useState("");
  const { data: barbers } = useAdminQuery<Paged<{ _id: string; name: string }>>("barbers", { limit: 100 });
  const { data: all, isLoading } = useAdminQuery<{ items: Settlement[] }>("staff/settlements", barber ? { barber } : undefined);
  return (
    <>
      <PageHeader title="Liquidaciones" subtitle="Ventas, comisiones, adelantos, cuotas, bonos y horas extra en un solo cálculo." />
      <div className={styles.row} style={{ marginBottom: "1rem" }}>
        <Select tone="light" placeholder="Elegí un barbero para liquidar" value={barber} onChange={(e) => setBarber(e.target.value)} options={(barbers?.items ?? []).map((b) => ({ value: b._id, label: b.name }))} />
      </div>
      {barber && <SettlementPanel barberId={barber} history={all?.items} />}
      {!barber && (
        <Card tone="light" title="Últimas liquidaciones" padded={false}>
          <DataTable loading={isLoading} rows={all?.items} rowKey={(s) => s._id} columns={[
            { key: "b", header: "Barbero", render: (s) => s.barber?.name },
            { key: "l", header: "Período", render: (s) => s.label },
            { key: "v", header: "Ventas", align: "right", render: (s) => money(s.salesTotal ?? 0), hideOnMobile: true },
            { key: "p", header: "Pagado", align: "right", render: (s) => <strong>{money(s.payout)}</strong> },
            { key: "d", header: "Fecha", render: (s) => date(s.paidAt) },
            { key: "s", header: "Barbero", render: (s) => (s.acceptedAt ? <Badge tone="success">Aceptada</Badge> : s.disputeNote ? <Badge tone="danger">Observada</Badge> : <Badge>Sin confirmar</Badge>) },
          ]} />
        </Card>
      )}
    </>
  );
}
