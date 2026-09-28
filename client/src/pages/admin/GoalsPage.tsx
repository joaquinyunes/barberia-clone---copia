import { useState } from "react";
import { Button, Card, Input, Modal, Select } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { Paged } from "@/types";
import { currentPeriod, money, periodLabel } from "@/utils/format";
import styles from "./admin.module.css";

const METRICS = [
  { value: "revenue", label: "Facturación ($)" },
  { value: "services", label: "Servicios" },
  { value: "haircuts", label: "Cortes" },
  { value: "beards", label: "Barbas" },
  { value: "products", label: "Productos vendidos" },
];
interface Progress {
  goal: { _id: string; barber: { _id: string; name: string }; bonus?: { type: string; value: number }; tiers?: { pct: number; bonus: number }[] };
  targets: { metric: string; target: number; actual: number; pct: number }[];
  pct: number;
  achieved: boolean;
  bonus: number;
}

export default function GoalsPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [open, setOpen] = useState(false);
  const { data } = useAdminQuery<{ items: Progress[] }>("staff/goals", { period });
  const remove = useAdminAction((id: string) => adminApi.remove("staff/goals", id), { success: "Objetivo eliminado" });
  return (
    <>
      <PageHeader title="Objetivos" subtitle={`Metas y bonos de ${periodLabel(period)}`} actions={
        <>
          <input type="month" className={styles.month} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Período" />
          <Button onClick={() => setOpen(true)}>Nuevo objetivo</Button>
        </>
      } />
      <div className={styles.threeCols}>
        {data?.items.map((p) => (
          <Card key={p.goal._id} tone="light" title={p.goal.barber?.name} actions={<Button size="sm" variant="ghost" onClick={() => remove.mutate(p.goal._id)}>Quitar</Button>}>
            <div className={styles.stack}>
              {p.targets.map((t) => (
                <div key={t.metric}>
                  <div className={styles.row}><span>{METRICS.find((m) => m.value === t.metric)?.label}</span><span className={styles.spacer} /><strong>{t.pct}%</strong></div>
                  <div className={`${styles.progress} ${t.pct >= 100 ? styles.progressOk : ""}`}><span style={{ width: `${Math.min(100, t.pct)}%` }} /></div>
                  <span className={styles.small}>{t.metric === "revenue" ? `${money(t.actual)} de ${money(t.target)}` : `${t.actual} de ${t.target}`}</span>
                </div>
              ))}
              <p className={p.achieved ? styles.okText : styles.muted}>
                {p.achieved ? `✓ Cumplido · bono ${money(p.bonus)}` : `Bono al cumplir: ${p.goal.bonus?.type === "percent" ? `${p.goal.bonus.value}% de la facturación` : money(p.goal.bonus?.value ?? 0)}`}
              </p>
            </div>
          </Card>
        ))}
      </div>
      {data?.items.length === 0 && <p className={styles.muted}>No hay objetivos cargados para este mes.</p>}
      {open && <GoalModal period={period} onClose={() => setOpen(false)} />}
    </>
  );
}

function GoalModal({ period, onClose }: { period: string; onClose: () => void }) {
  const { data: barbers } = useAdminQuery<Paged<{ _id: string; name: string }>>("barbers", { status: "active", limit: 100 });
  const [barber, setBarber] = useState("");
  const [targets, setTargets] = useState([{ metric: "revenue", target: 1500000 }]);
  const [bonus, setBonus] = useState({ type: "fixed", value: 50000 });
  const [tier, setTier] = useState({ pct: 120, bonus: 20000 });
  const save = useAdminAction(() => adminApi.post("staff/goals", { barber, period, targets, bonus, tiers: tier.bonus ? [tier] : [] }), { success: "Objetivo guardado", onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title={`Objetivo ${periodLabel(period)}`} footer={<Button disabled={!barber} loading={save.isPending} onClick={() => save.mutate(undefined)}>Guardar</Button>}>
      <div className={styles.stack}>
        <Select tone="light" label="Barbero" placeholder="Elegí" value={barber} onChange={(e) => setBarber(e.target.value)} options={(barbers?.items ?? []).map((b) => ({ value: b._id, label: b.name }))} />
        {targets.map((t, i) => (
          <div key={i} className={styles.formGrid}>
            <Select tone="light" label="Meta" value={t.metric} onChange={(e) => setTargets(targets.map((x, j) => (j === i ? { ...x, metric: e.target.value } : x)))} options={METRICS} />
            <Input tone="light" label="Objetivo" type="number" value={t.target} onChange={(e) => setTargets(targets.map((x, j) => (j === i ? { ...x, target: Number(e.target.value) } : x)))} />
          </div>
        ))}
        <Button size="sm" variant="light" onClick={() => setTargets([...targets, { metric: "haircuts", target: 50 }])}>+ Otra meta (se deben cumplir todas)</Button>
        <div className={styles.formGrid}>
          <Select tone="light" label="Bono" value={bonus.type} onChange={(e) => setBonus({ ...bonus, type: e.target.value })} options={[{ value: "fixed", label: "Monto fijo" }, { value: "percent", label: "% de la facturación" }]} />
          <Input tone="light" label={bonus.type === "fixed" ? "Monto" : "%"} type="number" value={bonus.value} onChange={(e) => setBonus({ ...bonus, value: Number(e.target.value) })} />
          <Input tone="light" label="Escalón extra: si supera el (%)" type="number" value={tier.pct} onChange={(e) => setTier({ ...tier, pct: Number(e.target.value) })} />
          <Input tone="light" label="… suma otro bono de" type="number" value={tier.bonus} onChange={(e) => setTier({ ...tier, bonus: Number(e.target.value) })} />
        </div>
      </div>
    </Modal>
  );
}
