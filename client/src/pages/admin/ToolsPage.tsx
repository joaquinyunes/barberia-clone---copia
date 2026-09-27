import { useState } from "react";
import { Badge, Button, Input, Modal, Select } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { ResourcePage } from "@/features/admin/components/ResourcePage/ResourcePage";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { Paged } from "@/types";
import { date, money } from "@/utils/format";
import styles from "./admin.module.css";

interface Tool {
  _id: string; code: string; name: string; brand?: string; type?: string; owner: string; status: string; purchaseCost?: number;
  assignedTo?: { _id: string; name: string }; assignments: { barber: string; from: string; to?: string }[];
  lastMaintenanceAt?: string; nextMaintenanceAt?: string; maintenance: { date: string; type: string; cost?: number; notes?: string }[];
}
const STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  ok: { label: "OK", tone: "success" }, maintenance: { label: "En service", tone: "warning" }, broken: { label: "Rota", tone: "danger" }, retired: { label: "Baja", tone: "neutral" },
};

export default function ToolsPage() {
  const [selected, setSelected] = useState<Tool | null>(null);
  return (
    <>
      <ResourcePage<Tool>
        title="Herramientas"
        subtitle="Máquinas, trimmers y tijeras: a quién están asignadas y cuándo toca el mantenimiento."
        resource="tools"
        singular="herramienta"
        defaults={{ owner: "business", status: "ok", maintenanceEveryDays: 30, type: "máquina" }}
        columns={[
          { key: "c", header: "Código", render: (t) => <strong>{t.code}</strong> },
          { key: "n", header: "Herramienta", render: (t) => <>{t.name}<div className={styles.small}>{t.owner === "business" ? "De la barbería" : "Del barbero"}</div></> },
          { key: "a", header: "Asignada a", render: (t) => t.assignedTo?.name ?? "—" },
          { key: "m", header: "Próx. mantenimiento", render: (t) => <span className={t.nextMaintenanceAt && new Date(t.nextMaintenanceAt) < new Date() ? styles.dangerText : undefined}>{date(t.nextMaintenanceAt)}</span>, hideOnMobile: true },
          { key: "s", header: "Estado", render: (t) => <Badge tone={STATUS[t.status]?.tone}>{STATUS[t.status]?.label}</Badge> },
        ]}
        rowActions={(t) => <Button size="sm" variant="light" onClick={() => setSelected(t)}>Asignar / service</Button>}
        fields={[
          { name: "code", label: "Código interno", required: true, placeholder: "JRL #003" },
          { name: "name", label: "Descripción", required: true },
          { name: "brand", label: "Marca" },
          { name: "type", label: "Tipo", placeholder: "máquina, trimmer, shaver, tijera" },
          { name: "owner", label: "Propietario", type: "select", required: true, options: [{ value: "business", label: "Barbería" }, { value: "barber", label: "Barbero" }] },
          { name: "status", label: "Estado", type: "select", required: true, options: Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label })) },
          { name: "purchaseCost", label: "Costo", type: "money" },
          { name: "purchaseDate", label: "Fecha de compra", type: "date" },
          { name: "maintenanceEveryDays", label: "Mantenimiento cada (días)", type: "number" },
          { name: "notes", label: "Notas", type: "textarea", span: 2 },
        ]}
      />
      {selected && <ToolModal tool={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function ToolModal({ tool, onClose }: { tool: Tool; onClose: () => void }) {
  const { data: barbers } = useAdminQuery<Paged<{ _id: string; name: string }>>("barbers", { limit: 100 });
  const [barber, setBarber] = useState(tool.assignedTo?._id ?? "");
  const [m, setM] = useState({ type: "Limpieza y lubricación", cost: 0, notes: "" });
  const assign = useAdminAction(() => adminApi.post(`tools/${tool._id}/assign`, { barber: barber || null }), { success: barber ? "Herramienta asignada" : "Devolución registrada", onSuccess: onClose });
  const maint = useAdminAction(() => adminApi.post(`tools/${tool._id}/maintenance`, m), { success: "Mantenimiento registrado", onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title={`${tool.code} · ${tool.name}`} size="lg">
      <div className={styles.twoCols}>
        <div className={styles.stack}>
          <h4>Asignación</h4>
          <Select tone="light" value={barber} onChange={(e) => setBarber(e.target.value)} placeholder="Sin asignar (devuelta)" options={(barbers?.items ?? []).map((b) => ({ value: b._id, label: b.name }))} />
          <Button loading={assign.isPending} onClick={() => assign.mutate(undefined)}>Guardar asignación</Button>
          <ul className={styles.lines}>
            {tool.assignments.map((a, i) => <li key={i}><span>{barbers?.items.find((b) => b._id === a.barber)?.name ?? "Barbero"}</span><span>{date(a.from)} → {a.to ? date(a.to) : "hoy"}</span></li>)}
          </ul>
        </div>
        <div className={styles.stack}>
          <h4>Mantenimiento</h4>
          <Select tone="light" value={m.type} onChange={(e) => setM({ ...m, type: e.target.value })} options={["Limpieza y lubricación", "Cambio de cuchilla", "Reparación", "Cambio de batería", "Afilado"].map((v) => ({ value: v, label: v }))} />
          <Input tone="light" label="Costo" type="number" value={m.cost || ""} onChange={(e) => setM({ ...m, cost: Number(e.target.value) })} />
          <Input tone="light" label="Notas" value={m.notes} onChange={(e) => setM({ ...m, notes: e.target.value })} />
          <Button loading={maint.isPending} onClick={() => maint.mutate(undefined)}>Registrar</Button>
          <ul className={styles.lines}>
            {[...tool.maintenance].reverse().map((x, i) => <li key={i}><span>{date(x.date)} · {x.type}</span><span>{x.cost ? money(x.cost) : ""}</span></li>)}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
