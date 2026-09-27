import { useState } from "react";
import { IoAdd } from "react-icons/io5";
import { Button, Card, Checkbox, DataTable, Input, Modal, Select, Stat } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { useAdminStore } from "@/features/admin/adminStore";
import { LocationPicker } from "@/features/admin/components/LocationPicker/LocationPicker";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { Paged } from "@/types";
import { currentPeriod, date, isoDay, money } from "@/utils/format";
import { METHOD_LABELS } from "@/utils/labels";
import styles from "./admin.module.css";

interface Expense { _id: string; date: string; amount: number; category: string; description?: string; method: string; supplier?: { name: string }; barber?: { name: string }; recurring?: boolean; createdByName?: string }

export default function ExpensesPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [category, setCategory] = useState("");
  const [open, setOpen] = useState(false);
  const { data: settings } = useAdminQuery<{ expenseCategories: string[] }>("settings");
  const [y, m] = period.split("-").map(Number);
  const to = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const { data, isLoading } = useAdminQuery<{ items: Expense[]; total: number }>("expenses", { from: `${period}-01`, to, category: category || undefined });
  const voidIt = useAdminAction((id: string) => adminApi.post(`expenses/${id}/void`, { reason: "Anulado desde el panel" }), { success: "Gasto anulado" });
  const byCat = new Map<string, number>();
  data?.items.forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount));
  return (
    <>
      <PageHeader title="Gastos" subtitle="Cada gasto sale de la caja y alimenta el reporte de resultados." actions={
        <>
          <input type="month" className={styles.month} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Período" />
          <Button icon={<IoAdd />} onClick={() => setOpen(true)}>Nuevo gasto</Button>
        </>
      } />
      <div className={styles.stats}>
        <Stat label="Total del mes" value={money(data?.total)} tone="negative" />
        {[...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, v]) => <Stat key={c} label={c} value={money(v)} onClick={() => setCategory(c === category ? "" : c)} />)}
      </div>
      <Card tone="light" padded={false}>
        <DataTable loading={isLoading} rows={data?.items} rowKey={(e) => e._id} columns={[
          { key: "d", header: "Fecha", render: (e) => date(e.date) },
          { key: "c", header: "Categoría", render: (e) => <>{e.category}{e.recurring && <span className={styles.small}> · fijo</span>}</> },
          { key: "de", header: "Descripción", render: (e) => [e.description, e.supplier?.name, e.barber && `asignado a ${e.barber.name}`].filter(Boolean).join(" · "), hideOnMobile: true },
          { key: "m", header: "Medio", render: (e) => METHOD_LABELS[e.method], hideOnMobile: true },
          { key: "a", header: "Monto", align: "right", render: (e) => money(e.amount) },
          { key: "x", header: "", render: (e) => <Button size="sm" variant="ghost" onClick={() => window.confirm("¿Anular este gasto? El dinero vuelve a la caja.") && voidIt.mutate(e._id)}>Anular</Button> },
        ]} />
      </Card>
      {open && <ExpenseModal categories={settings?.expenseCategories ?? []} onClose={() => setOpen(false)} />}
    </>
  );
}

function ExpenseModal({ categories, onClose }: { categories: string[]; onClose: () => void }) {
  const location = useAdminStore((s) => s.location);
  const { data: suppliers } = useAdminQuery<Paged<{ _id: string; name: string }>>("suppliers", { limit: 200 });
  const { data: barbers } = useAdminQuery<Paged<{ _id: string; name: string }>>("barbers", { limit: 100 });
  const [f, setF] = useState({ date: isoDay(), amount: 0, category: categories[0] ?? "Otros", supplier: "", barber: "", method: "transfer", description: "", recurring: false });
  const save = useAdminAction(() => adminApi.post("expenses", { ...f, date: `${f.date}T12:00:00-03:00`, supplier: f.supplier || undefined, barber: f.barber || undefined, location }), { success: "Gasto registrado", onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Nuevo gasto" footer={<Button disabled={!(f.amount > 0) || !location} loading={save.isPending} onClick={() => save.mutate(undefined)}>Guardar</Button>}>
      <div className={styles.formGrid}>
        <div className={styles.full}><LocationPicker /></div>
        <Input tone="light" label="Fecha" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <Input tone="light" label="Monto" type="number" value={f.amount || ""} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} />
        <Select tone="light" label="Categoría" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={categories.map((c) => ({ value: c, label: c }))} />
        <Select tone="light" label="Medio de pago" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} options={["transfer", "cash", "mercadopago", "card"].map((m) => ({ value: m, label: METHOD_LABELS[m] }))} />
        <Select tone="light" label="Proveedor (opcional)" placeholder="—" value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} options={(suppliers?.items ?? []).map((s) => ({ value: s._id, label: s.name }))} />
        <Select tone="light" label="Asignado a barbero (opcional)" placeholder="—" value={f.barber} onChange={(e) => setF({ ...f, barber: e.target.value })} options={(barbers?.items ?? []).map((b) => ({ value: b._id, label: b.name }))} />
        <Input tone="light" className={styles.full} label="Descripción" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <Checkbox tone="light" label="Es un gasto fijo mensual (para la proyección de caja)" checked={f.recurring} onChange={(e) => setF({ ...f, recurring: e.target.checked })} />
      </div>
    </Modal>
  );
}
