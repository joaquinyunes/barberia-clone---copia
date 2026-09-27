import { useState } from "react";
import { useParams } from "react-router-dom";
import { Badge, Button, Card, Checkbox, DataTable, Input, PageLoader, Select, Stat, Tabs } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { useConfirm } from "@/features/admin/components/Confirm/useConfirm";
import { Money } from "@/features/admin/components/Money/Money";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import { useServices } from "@/features/catalog/useCatalog";
import type { Movement } from "@/types";
import { currentPeriod, date, minutesToHours, money, periodLabel, time } from "@/utils/format";
import { BARBER_STATUS, CATEGORY_LABELS, DAYS, MOVEMENT_LABELS } from "@/utils/labels";
import { AdvanceForm, DebtForm } from "./DebtsPage";
import { SettlementPanel } from "./SettlementsPage";
import styles from "./admin.module.css";

interface Summary {
  barber: {
    _id: string; name: string; status: string; phone?: string; dni?: string; hiredAt?: string; location?: { name: string }; station?: { name: string };
    specialties?: string[]; defaultCommissionPct?: number; commissionByCategory?: Record<string, number>; commissionOverrides?: { service: string; commission: { type: string; value: number } }[];
    schedule: { day: number; start?: string; end?: string; off?: boolean; breaks?: { start: string; end: string; label?: string }[] }[];
    absences: { from: string; to: string; type: string; note?: string }[];
    hourlyRate?: number;
  };
  balance: number;
  metrics: { revenue: number; services: number; haircuts: number; beards: number; products: number; uniqueClients: number };
  totals: Record<string, number>;
  upcoming: { _id: string; startsAt: string; client: { name: string }; service: { name: string } }[];
  debts: { _id: string; concept: string; total: number; remaining: number; installments: { number: number; amount: number; dueDate: string; status: string }[] }[];
  tools: { _id: string; code: string; name: string; nextMaintenanceAt?: string }[];
  goal: { pct: number; achieved: boolean; bonus: number; targets: { metric: string; target: number; actual: number; pct: number }[] } | null;
  settlements: { _id: string; label?: string; payout: number; paidAt?: string; method?: string; status: string; acceptedAt?: string; disputeNote?: string }[];
  attendance: { workedMinutes: number; overtimeMinutes: number; lateCount: number; absences: number };
}

const METRIC_LABELS: Record<string, string> = { revenue: "Facturación", services: "Servicios", haircuts: "Cortes", beards: "Barbas", products: "Productos", new_clients: "Clientes nuevos" };

export default function BarberDetailPage() {
  const { id = "" } = useParams();
  const [period, setPeriod] = useState(currentPeriod());
  const [tab, setTab] = useState("cuenta");
  const { data, isLoading } = useAdminQuery<Summary>(`barbers/${id}/summary`, { period });
  const { data: statement } = useAdminQuery<{ balance: number; movements: Movement[] }>(`ledger/barber/${id}`);
  const { confirm, dialog } = useConfirm();
  const reverse = useAdminAction(({ mid, reason }: { mid: string; reason: string }) => adminApi.post(`ledger/movements/${mid}/reverse`, { reason }), { success: "Movimiento anulado" });
  const setStatus = useAdminAction((status: string) => adminApi.update("barbers", id, { status }), { success: "Estado actualizado" });
  if (isLoading || !data) return <PageLoader />;
  const b = data.barber;
  return (
    <>
      {dialog}
      <PageHeader
        title={b.name}
        subtitle={<>{b.location?.name} · {b.station?.name ?? "sin puesto"} · ingreso {date(b.hiredAt)} · DNI {b.dni ?? "—"}</>}
        actions={
          <>
            <select className={styles.input} value={b.status} onChange={(e) => setStatus.mutate(e.target.value)} aria-label="Estado">
              {Object.entries(BARBER_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input type="month" className={styles.month} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Período" />
          </>
        }
      />
      <div className={styles.stats}>
        <Stat label="Saldo (le debemos)" value={<Money value={data.balance} />} tone={data.balance >= 0 ? "negative" : "positive"} hint={data.balance < 0 ? "El barbero nos debe" : "Pendiente de liquidar"} />
        <Stat label={`Ventas ${periodLabel(period)}`} value={money(data.metrics.revenue)} hint={`${data.metrics.services} servicios · ${data.metrics.uniqueClients} clientes`} />
        <Stat label="Comisiones del mes" value={money(data.totals.commission ?? 0)} hint={`Propinas ${money(data.totals.tip ?? 0)}`} />
        <Stat label="Adelantos del mes" value={money(-(data.totals.advance ?? 0))} />
        <Stat label="Horas trabajadas" value={minutesToHours(data.attendance.workedMinutes)} hint={`${minutesToHours(data.attendance.overtimeMinutes)} extra · ${data.attendance.lateCount} tardanzas`} />
        {data.goal && <Stat label="Objetivo" value={`${data.goal.pct}%`} tone={data.goal.achieved ? "positive" : "warning"} hint={data.goal.achieved ? `Bono ${money(data.goal.bonus)}` : "En curso"} />}
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: "cuenta", label: "Cuenta y movimientos" },
        { value: "adelantos", label: "Adelantos y deudas", count: data.debts.length },
        { value: "liquidacion", label: "Liquidación" },
        { value: "objetivo", label: "Objetivo" },
        { value: "agenda", label: "Próximos turnos", count: data.upcoming.length },
        { value: "herramientas", label: "Herramientas", count: data.tools.length },
        { value: "config", label: "Horario y comisiones" },
      ]} />

      {tab === "cuenta" && (
        <DataTable rows={statement?.movements} rowKey={(m) => m._id} columns={[
          { key: "d", header: "Fecha", render: (m) => date(m.date) },
          { key: "t", header: "Tipo", render: (m) => <Badge tone={m.amount > 0 ? "success" : "danger"}>{MOVEMENT_LABELS[m.type] ?? m.type}</Badge> },
          { key: "c", header: "Concepto", render: (m) => <span style={{ textDecoration: m.reversed ? "line-through" : undefined }}>{m.concept}</span> },
          { key: "u", header: "Registró", render: (m) => m.createdByName, hideOnMobile: true },
          { key: "a", header: "Monto", align: "right", render: (m) => <Money value={m.amount} signed /> },
          { key: "s", header: "Saldo", align: "right", render: (m) => <Money value={m.balanceAfter} colored={false} /> },
          { key: "x", header: "", render: (m) => !m.reversed && m.type !== "reversal" && (
            <Button size="sm" variant="ghost" onClick={async () => { const reason = await confirm({ title: "Anular movimiento", body: <p>{m.concept} ({money(m.amount)}). Se crea un contra-asiento; el original queda registrado.</p>, reason: true, danger: true }); if (reason) reverse.mutate({ mid: m._id, reason }); }}>Anular</Button>
          ) },
        ]} />
      )}

      {tab === "adelantos" && (
        <div className={styles.twoCols}>
          <div className={styles.stack}>
            <Card tone="light" title="Nuevo adelanto"><AdvanceForm barberId={id} balance={data.balance} /></Card>
            <Card tone="light" title="Nueva deuda / préstamo en cuotas"><DebtForm barberId={id} /></Card>
          </div>
          <Card tone="light" title="Deudas activas">
            {data.debts.length === 0 ? <p className={styles.muted}>Sin deudas.</p> : data.debts.map((d) => (
              <div key={d._id} style={{ marginBottom: "1rem" }}>
                <strong>{d.concept}</strong> — {money(d.total)} · resta {money(d.remaining)}
                <ul className={styles.lines}>
                  {d.installments.map((i) => <li key={i.number}><span>{i.number}/{d.installments.length} · vence {date(i.dueDate)}</span><span>{money(i.amount)} {i.status === "applied" ? "✓" : i.status === "cancelled" ? "✕" : "pendiente"}</span></li>)}
                </ul>
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === "liquidacion" && <SettlementPanel barberId={id} history={data.settlements} />}

      {tab === "objetivo" && (
        <Card tone="light" title={`Objetivo ${periodLabel(period)}`}>
          {!data.goal ? <p className={styles.muted}>No tiene objetivo cargado para este mes. Configuralo en “Objetivos”.</p> : (
            <div className={styles.stack}>
              {data.goal.targets.map((t) => (
                <div key={t.metric}>
                  <div className={styles.row}><strong>{METRIC_LABELS[t.metric]}</strong><span className={styles.spacer} /><span>{t.metric === "revenue" ? `${money(t.actual)} / ${money(t.target)}` : `${t.actual} / ${t.target}`} · {t.pct}%</span></div>
                  <div className={`${styles.progress} ${t.pct >= 100 ? styles.progressOk : ""}`}><span style={{ width: `${Math.min(100, t.pct)}%` }} /></div>
                </div>
              ))}
              <p>{data.goal.achieved ? `✓ Cumplido: bono de ${money(data.goal.bonus)} (se suma en la liquidación)` : "Todavía no alcanzó todas las metas."}</p>
            </div>
          )}
        </Card>
      )}

      {tab === "agenda" && (
        <DataTable rows={data.upcoming} rowKey={(a) => a._id} empty="Sin turnos próximos" columns={[
          { key: "d", header: "Cuándo", render: (a) => `${date(a.startsAt)} ${time(a.startsAt)}` },
          { key: "c", header: "Cliente", render: (a) => a.client?.name },
          { key: "s", header: "Servicio", render: (a) => a.service?.name },
        ]} />
      )}

      {tab === "herramientas" && (
        <DataTable rows={data.tools} rowKey={(t) => t._id} empty="Sin herramientas asignadas" columns={[
          { key: "c", header: "Código", render: (t) => <strong>{t.code}</strong> },
          { key: "n", header: "Herramienta", render: (t) => t.name },
          { key: "m", header: "Próximo mantenimiento", render: (t) => date(t.nextMaintenanceAt) },
        ]} />
      )}

      {tab === "config" && <BarberConfig barber={b} />}
    </>
  );
}

function BarberConfig({ barber }: { barber: Summary["barber"] }) {
  const { data: services } = useServices();
  const [schedule, setSchedule] = useState(() => [1, 2, 3, 4, 5, 6, 0].map((d) => barber.schedule.find((s) => s.day === d) ?? { day: d, off: true }));
  const [byCat, setByCat] = useState<Record<string, number>>(barber.commissionByCategory ?? {});
  const [overrides, setOverrides] = useState(barber.commissionOverrides ?? []);
  const [absence, setAbsence] = useState({ from: "", to: "", type: "vacation", note: "" });
  const save = useAdminAction(
    () => adminApi.update("barbers", barber._id, {
      schedule: schedule.map((s) => (s.off ? { day: s.day, off: true } : { day: s.day, start: s.start, end: s.end, breaks: s.breaks ?? [] })),
      commissionByCategory: Object.fromEntries(Object.entries(byCat).filter(([, v]) => v !== undefined && !Number.isNaN(v))),
      commissionOverrides: overrides.filter((o) => o.service),
    }),
    { success: "Horario y comisiones guardados" },
  );
  const addAbsence = useAdminAction(
    () => adminApi.update("barbers", barber._id, { absences: [...barber.absences, { ...absence, from: `${absence.from}T00:00:00-03:00`, to: `${absence.to}T23:59:00-03:00` }] }),
    { success: "Ausencia registrada" },
  );
  const update = (i: number, patch: Partial<(typeof schedule)[number]>) => setSchedule((s) => s.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  return (
    <div className={styles.twoCols}>
      <Card tone="light" title="Horario semanal" actions={<Button size="sm" loading={save.isPending} onClick={() => save.mutate(undefined)}>Guardar</Button>}>
        {schedule.map((d, i) => (
          <div key={d.day} className={styles.row} style={{ marginBottom: ".5rem" }}>
            <strong style={{ width: 90 }}>{DAYS[d.day]}</strong>
            <Checkbox tone="light" label="Franco" checked={!!d.off} onChange={(e) => update(i, { off: e.target.checked, start: d.start ?? "09:00", end: d.end ?? "18:00" })} />
            {!d.off && (
              <>
                <input type="time" className={styles.input} value={d.start ?? ""} onChange={(e) => update(i, { start: e.target.value })} aria-label="Entrada" />
                <input type="time" className={styles.input} value={d.end ?? ""} onChange={(e) => update(i, { end: e.target.value })} aria-label="Salida" />
                <span className={styles.small}>Almuerzo</span>
                <input type="time" className={styles.input} value={d.breaks?.[0]?.start ?? ""} onChange={(e) => update(i, { breaks: e.target.value ? [{ start: e.target.value, end: d.breaks?.[0]?.end ?? e.target.value, label: "Almuerzo" }] : [] })} aria-label="Inicio almuerzo" />
                <input type="time" className={styles.input} value={d.breaks?.[0]?.end ?? ""} onChange={(e) => d.breaks?.[0] && update(i, { breaks: [{ ...d.breaks[0], end: e.target.value }] })} aria-label="Fin almuerzo" />
              </>
            )}
          </div>
        ))}
        <h4>Vacaciones, francos y licencias</h4>
        {barber.absences.map((a, i) => <p key={i} className={styles.small}>{date(a.from)} → {date(a.to)} · {a.type} {a.note}</p>)}
        <div className={styles.row}>
          <input type="date" className={styles.input} value={absence.from} onChange={(e) => setAbsence({ ...absence, from: e.target.value })} aria-label="Desde" />
          <input type="date" className={styles.input} value={absence.to} onChange={(e) => setAbsence({ ...absence, to: e.target.value })} aria-label="Hasta" />
          <select className={styles.input} value={absence.type} onChange={(e) => setAbsence({ ...absence, type: e.target.value })} aria-label="Tipo">
            <option value="vacation">Vacaciones</option><option value="day_off">Franco</option><option value="leave">Licencia</option><option value="other">Otro</option>
          </select>
          <Button size="sm" variant="light" disabled={!absence.from || !absence.to} onClick={() => addAbsence.mutate(undefined)}>Agregar</Button>
        </div>
      </Card>
      <Card tone="light" title="Comisiones" actions={<Button size="sm" loading={save.isPending} onClick={() => save.mutate(undefined)}>Guardar</Button>}>
        <p className={styles.small}>Prioridad: excepción por servicio → comisión propia del servicio → % por categoría → % base ({barber.defaultCommissionPct ?? "general"}%).</p>
        <div className={styles.formGrid}>
          {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
            <Input key={cat} tone="light" type="number" label={`${label} (%)`} value={byCat[cat] ?? ""} onChange={(e) => setByCat({ ...byCat, [cat]: e.target.value === "" ? (undefined as unknown as number) : Number(e.target.value) })} />
          ))}
        </div>
        <h4>Excepciones por servicio</h4>
        {overrides.map((o, i) => (
          <div key={i} className={styles.row} style={{ marginBottom: ".4rem" }}>
            <Select tone="light" value={o.service} onChange={(e) => setOverrides(overrides.map((x, j) => (j === i ? { ...x, service: e.target.value } : x)))} options={(services ?? []).map((s) => ({ value: s._id, label: s.name }))} placeholder="Servicio" />
            <Select tone="light" value={o.commission.type} onChange={(e) => setOverrides(overrides.map((x, j) => (j === i ? { ...x, commission: { ...x.commission, type: e.target.value } } : x)))} options={[{ value: "percent", label: "%" }, { value: "fixed", label: "$ fijo" }]} />
            <Input tone="light" type="number" value={o.commission.value} onChange={(e) => setOverrides(overrides.map((x, j) => (j === i ? { ...x, commission: { ...x.commission, value: Number(e.target.value) } } : x)))} />
            <Button size="sm" variant="ghost" onClick={() => setOverrides(overrides.filter((_, j) => j !== i))}>Quitar</Button>
          </div>
        ))}
        <Button size="sm" variant="light" onClick={() => setOverrides([...overrides, { service: "", commission: { type: "fixed", value: 0 } }])}>+ Excepción</Button>
      </Card>
    </div>
  );
}
