import { Badge, Card, DataTable, Stat } from "@/components/ui";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { Appointment } from "@/types";
import { dateTime, money } from "@/utils/format";
import { CANCEL_BY_LABELS } from "@/utils/labels";
import styles from "./admin.module.css";

export default function CancellationsPage() {
  const { data, isLoading } = useAdminQuery<{ items: Appointment[]; byType: Record<string, number>; retainedDeposits: number }>("appointments/cancellations");
  return (
    <>
      <PageHeader title="Registro de cancelaciones" subtitle="Separado por quién canceló, con anticipación y seña." />
      <div className={styles.stats}>
        {Object.entries(CANCEL_BY_LABELS).map(([k, label]) => <Stat key={k} label={label} value={data?.byType[k] ?? 0} />)}
        <Stat label="Señas retenidas" value={money(data?.retainedDeposits)} tone="positive" />
      </div>
      <Card tone="light" padded={false}>
        <DataTable
          loading={isLoading}
          rows={data?.items}
          rowKey={(a) => a._id}
          columns={[
            { key: "c", header: "Cliente", render: (a) => a.client?.name },
            { key: "d", header: "Turno", render: (a) => dateTime(a.startsAt) },
            { key: "b", header: "Barbero", render: (a) => a.barber?.name, hideOnMobile: true },
            { key: "s", header: "Servicio", render: (a) => a.service?.name, hideOnMobile: true },
            { key: "t", header: "Tipo", render: (a) => <Badge tone={a.cancellation?.by === "no_show" ? "danger" : "neutral"}>{CANCEL_BY_LABELS[a.cancellation?.by ?? ""] ?? "—"}</Badge> },
            { key: "n", header: "Anticipación", render: (a) => (a.cancellation?.noticeHours !== undefined ? `${a.cancellation.noticeHours} h` : "—"), hideOnMobile: true },
            { key: "r", header: "Motivo", render: (a) => a.cancellation?.reason ?? "—", hideOnMobile: true },
            { key: "dep", header: "Seña", render: (a) => (a.deposit?.paid ? `${money(a.deposit.paid)}${a.cancellation?.depositRetained ? " · retenida" : " · a favor"}` : "—") },
          ]}
        />
      </Card>
    </>
  );
}
