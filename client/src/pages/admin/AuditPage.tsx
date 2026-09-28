import { useState } from "react";
import { Card, DataTable, Select } from "@/components/ui";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminQuery } from "@/features/admin/hooks/useAdmin";
import { dateTime } from "@/utils/format";
import styles from "./admin.module.css";

interface Log { _id: string; createdAt: string; userName: string; role: string; entity: string; summary: string; changes?: Record<string, { from: unknown; to: unknown }> }
const ROLE: Record<string, string> = { admin: "Administrador", manager: "Encargado", reception: "Recepción", barber: "Barbero", system: "Sistema" };
const ENTITIES = ["Turno", "Cliente", "Barbero", "Servicio", "Adelanto", "Deuda", "Liquidación", "Caja", "Gasto", "Compra", "Movimiento", "Producto", "Stock", "Usuario", "Configuración", "Gift card", "Membresía", "Promoción", "Pedido"];

export default function AuditPage() {
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminQuery<{ items: Log[]; pages: number }>("audit", { entity: entity || undefined, page });
  const fmt = (v: unknown) => (typeof v === "object" ? JSON.stringify(v) : String(v ?? "—"));
  return (
    <>
      <PageHeader title="Auditoría" subtitle="Todo cambio importante con usuario, fecha y hora." actions={<Select tone="light" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} placeholder="Todo" options={ENTITIES.map((e) => ({ value: e, label: e }))} />} />
      <Card tone="light" padded={false}>
        <DataTable loading={isLoading} rows={data?.items} rowKey={(l) => l._id} columns={[
          { key: "d", header: "Fecha", render: (l) => dateTime(l.createdAt) },
          { key: "u", header: "Usuario", render: (l) => <>{l.userName}<div className={styles.small}>{ROLE[l.role] ?? l.role}</div></> },
          { key: "s", header: "Acción", render: (l) => <>{l.summary}{l.changes && !Array.isArray(l.changes) && <div className={styles.small}>{Object.entries(l.changes).slice(0, 3).map(([k, v]) => `${k}: ${fmt(v.from)} → ${fmt(v.to)}`).join(" · ")}</div>}</> },
        ]} />
      </Card>
      <div className={styles.row} style={{ marginTop: "1rem", justifyContent: "center" }}>
        <button className={styles.chip} disabled={page <= 1} onClick={() => setPage(page - 1)}>← Anterior</button>
        <span className={styles.muted}>Página {page} de {data?.pages ?? 1}</span>
        <button className={styles.chip} disabled={page >= (data?.pages ?? 1)} onClick={() => setPage(page + 1)}>Siguiente →</button>
      </div>
    </>
  );
}
