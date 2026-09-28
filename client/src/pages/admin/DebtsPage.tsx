import { useState } from "react";
import { Badge, Button, Card, Checkbox, DataTable, Input, Select, toast } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { useAdminStore } from "@/features/admin/adminStore";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import { errorCode, errorMessage } from "@/services/http";
import type { Movement, Paged } from "@/types";
import { date, isoDay, money } from "@/utils/format";
import { METHOD_LABELS } from "@/utils/labels";
import styles from "./admin.module.css";

const METHODS = ["cash", "transfer", "mercadopago", "card"].map((m) => ({ value: m, label: METHOD_LABELS[m] }));
const CATEGORIES = [
  { value: "loan", label: "Préstamo" },
  { value: "product", label: "Producto comprado" },
  { value: "tool", label: "Herramienta" },
  { value: "cash_shortage", label: "Faltante de caja" },
  { value: "advance", label: "Adelanto en cuotas" },
  { value: "other", label: "Otro" },
];

/** Adelanto: descuenta del saldo y sale de caja. Respeta el tope configurado (se puede forzar). */
export function AdvanceForm({ barberId, balance }: { barberId: string; balance?: number }) {
  const location = useAdminStore((s) => s.location);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState("cash");
  const [reason, setReason] = useState("Adelanto semanal");
  const [limitMsg, setLimitMsg] = useState<string>();
  const give = useAdminAction(
    (force: boolean) => adminApi.post<{ balanceBefore: number; balanceAfter: number }>("staff/advances", { barber: barberId, amount, method, reason, location: location || undefined, force }),
    { success: (r) => `Adelanto registrado. Saldo: ${money(r.balanceBefore)} → ${money(r.balanceAfter)}`, silentError: true, onSuccess: () => { setAmount(0); setLimitMsg(undefined); } },
  );
  const submit = (force = false) =>
    give.mutate(force, { onError: (e) => (errorCode(e) === "ADVANCE_LIMIT" ? setLimitMsg(errorMessage(e)) : toast.error(errorMessage(e))) });
  return (
    <div className={styles.stack}>
      {balance !== undefined && <p className={styles.muted}>Saldo anterior: <strong>{money(balance)}</strong> → pendiente después del adelanto: <strong>{money(balance - (amount || 0))}</strong></p>}
      <div className={styles.formGrid}>
        <Input tone="light" label="Monto" type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
        <Select tone="light" label="Medio" value={method} onChange={(e) => setMethod(e.target.value)} options={METHODS} />
        <Input tone="light" className={styles.full} label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {limitMsg && (
        <p className={styles.dangerText}>{limitMsg} <Button size="sm" variant="danger" onClick={() => submit(true)}>Dar igual</Button></p>
      )}
      <Button disabled={!(amount > 0)} loading={give.isPending} onClick={() => submit(false)}>Registrar adelanto</Button>
    </div>
  );
}

/** Deuda del barbero con cuotas que se descuentan solas del saldo al vencer. */
export function DebtForm({ barberId }: { barberId: string }) {
  const location = useAdminStore((s) => s.location);
  const [f, setF] = useState({ category: "loan", concept: "", total: 0, installments: 1, firstDueDate: isoDay(), frequencyDays: 30, disbursed: false, method: "cash" });
  const create = useAdminAction(
    () => adminApi.post("staff/debts", { ...f, barber: barberId, firstDueDate: `${f.firstDueDate}T12:00:00-03:00`, location: location || undefined, method: f.disbursed ? f.method : undefined }),
    { success: "Deuda registrada", onSuccess: () => setF({ ...f, concept: "", total: 0 }) },
  );
  const cuota = f.installments > 0 ? Math.floor(f.total / f.installments) : 0;
  return (
    <div className={styles.stack}>
      <div className={styles.formGrid}>
        <Select tone="light" label="Motivo" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={CATEGORIES} />
        <Input tone="light" label="Detalle" placeholder="Ej: Compra máquina JRL" value={f.concept} onChange={(e) => setF({ ...f, concept: e.target.value })} />
        <Input tone="light" label="Monto total" type="number" value={f.total || ""} onChange={(e) => setF({ ...f, total: Number(e.target.value) })} />
        <Input tone="light" label="Cuotas" type="number" min={1} value={f.installments} onChange={(e) => setF({ ...f, installments: Number(e.target.value) })} hint={cuota ? `${f.installments} × ${money(cuota)}` : undefined} />
        <Input tone="light" label="Primera cuota" type="date" value={f.firstDueDate} onChange={(e) => setF({ ...f, firstDueDate: e.target.value })} />
        <Select tone="light" label="Frecuencia" value={String(f.frequencyDays)} onChange={(e) => setF({ ...f, frequencyDays: Number(e.target.value) })} options={[{ value: "7", label: "Semanal" }, { value: "15", label: "Quincenal" }, { value: "30", label: "Mensual" }]} />
        <Checkbox tone="light" className={styles.full} label="Se le entregó dinero (sale de caja)" checked={f.disbursed} onChange={(e) => setF({ ...f, disbursed: e.target.checked })} />
        {f.disbursed && <Select tone="light" label="Medio" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} options={METHODS} />}
      </div>
      <Button disabled={!f.concept || !(f.total > 0)} loading={create.isPending} onClick={() => create.mutate(undefined)}>Registrar deuda</Button>
    </div>
  );
}

interface Debt {
  _id: string;
  barber: { _id: string; name: string };
  category: string;
  concept: string;
  total: number;
  remaining: number;
  status: string;
  date: string;
  installments: { number: number; status: string }[];
}

export default function DebtsPage() {
  const [barber, setBarber] = useState("");
  const { data: barbers } = useAdminQuery<Paged<{ _id: string; name: string }>>("barbers", { limit: 100 });
  const { data: debts, isLoading } = useAdminQuery<{ items: Debt[] }>("staff/debts", { status: "active" });
  const { data: advances } = useAdminQuery<{ items: Movement[] }>("ledger/movements", { ownerType: "barber", type: "advance", limit: 50 });
  const applyDue = useAdminAction(() => adminApi.post<{ applied: number }>("staff/debts/apply-due"), { success: (r) => (r.applied ? `Se descontaron ${money(r.applied)} en cuotas` : "No había cuotas vencidas") });
  const cancel = useAdminAction((id: string) => adminApi.post(`staff/debts/${id}/cancel`), { success: "Deuda cancelada" });
  return (
    <>
      <PageHeader title="Adelantos y deudas" subtitle="Préstamos, herramientas, productos o faltantes: todo con cuotas que se descuentan del saldo." actions={<Button variant="light" loading={applyDue.isPending} onClick={() => applyDue.mutate(undefined)}>Aplicar cuotas vencidas</Button>} />
      <div className={styles.twoCols}>
        <Card tone="light" title="Cargar adelanto o deuda">
          <Select tone="light" label="Barbero" placeholder="Elegí un barbero" value={barber} onChange={(e) => setBarber(e.target.value)} options={(barbers?.items ?? []).map((b) => ({ value: b._id, label: b.name }))} />
          {barber && (
            <div className={styles.stack} style={{ marginTop: "1rem" }}>
              <h4>Adelanto</h4>
              <AdvanceForm barberId={barber} />
              <h4>Deuda en cuotas</h4>
              <DebtForm barberId={barber} />
            </div>
          )}
        </Card>
        <div className={styles.stack}>
          <Card tone="light" title="Deudas activas" padded={false}>
            <DataTable loading={isLoading} rows={debts?.items} rowKey={(d) => d._id} empty="Sin deudas activas" columns={[
              { key: "b", header: "Barbero", render: (d) => d.barber?.name },
              { key: "c", header: "Concepto", render: (d) => <>{d.concept}<div className={styles.small}>{CATEGORIES.find((c) => c.value === d.category)?.label}</div></> },
              { key: "q", header: "Cuotas", render: (d) => `${d.installments.filter((i) => i.status === "applied").length}/${d.installments.length}` },
              { key: "t", header: "Resta", align: "right", render: (d) => money(d.remaining) },
              { key: "x", header: "", render: (d) => <Button size="sm" variant="ghost" onClick={() => window.confirm("¿Cancelar las cuotas pendientes?") && cancel.mutate(d._id)}>Cancelar</Button> },
            ]} />
          </Card>
          <Card tone="light" title="Últimos adelantos" padded={false}>
            <DataTable rows={advances?.items} rowKey={(m) => m._id} columns={[
              { key: "d", header: "Fecha", render: (m) => date(m.date) },
              { key: "b", header: "Barbero", render: (m) => (typeof m.owner === "object" ? m.owner?.name : "") },
              { key: "c", header: "Motivo", render: (m) => m.concept },
              { key: "a", header: "Monto", align: "right", render: (m) => money(-m.amount) },
              { key: "s", header: "", render: (m) => m.reversed && <Badge>Anulado</Badge> },
            ]} />
          </Card>
        </div>
      </div>
    </>
  );
}
