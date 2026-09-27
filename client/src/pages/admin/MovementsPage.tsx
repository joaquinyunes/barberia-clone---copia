import { useState } from "react";
import { Badge, Card, DataTable, Select } from "@/components/ui";
import { Money } from "@/features/admin/components/Money/Money";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { Movement } from "@/types";
import { dateTime } from "@/utils/format";
import { METHOD_LABELS, MOVEMENT_LABELS } from "@/utils/labels";
import styles from "./admin.module.css";

const OWNER = { client: "Cliente", barber: "Barbero", supplier: "Proveedor" } as const;

/** Libro único: cada peso queda asociado a una persona y a un motivo. */
export default function MovementsPage() {
  const [ownerType, setOwnerType] = useState("");
  const [type, setType] = useState("");
  const { data, isLoading } = useAdminQuery<{ items: Movement[] }>("ledger/movements", { ownerType: ownerType || undefined, type: type || undefined, limit: 300 });
  return (
    <>
      <PageHeader title="Movimientos" subtitle="Todas las cuentas internas: clientes, barberos y proveedores. Positivo = la barbería le debe; negativo = le deben a la barbería." />
      <div className={styles.row} style={{ marginBottom: "1rem" }}>
        <Select tone="light" value={ownerType} onChange={(e) => setOwnerType(e.target.value)} placeholder="Todas las cuentas" options={Object.entries(OWNER).map(([value, label]) => ({ value, label }))} />
        <Select tone="light" value={type} onChange={(e) => setType(e.target.value)} placeholder="Todos los tipos" options={Object.entries(MOVEMENT_LABELS).map(([value, label]) => ({ value, label }))} />
      </div>
      <Card tone="light" padded={false}>
        <DataTable loading={isLoading} rows={data?.items} rowKey={(m) => m._id} columns={[
          { key: "d", header: "Fecha", render: (m) => dateTime(m.date) },
          { key: "o", header: "Cuenta", render: (m) => <>{typeof m.owner === "object" ? m.owner?.name : "—"}<div className={styles.small}>{OWNER[m.ownerType as keyof typeof OWNER]}</div></> },
          { key: "t", header: "Tipo", render: (m) => <Badge tone={m.amount > 0 ? "success" : "danger"}>{MOVEMENT_LABELS[m.type] ?? m.type}</Badge> },
          { key: "c", header: "Concepto", render: (m) => <span style={{ textDecoration: m.reversed ? "line-through" : undefined }}>{m.concept}</span> },
          { key: "m", header: "Medio", render: (m) => METHOD_LABELS[m.method ?? ""] ?? "—", hideOnMobile: true },
          { key: "u", header: "Usuario", render: (m) => m.createdByName, hideOnMobile: true },
          { key: "a", header: "Monto", align: "right", render: (m) => <Money value={m.amount} signed /> },
        ]} />
      </Card>
    </>
  );
}
