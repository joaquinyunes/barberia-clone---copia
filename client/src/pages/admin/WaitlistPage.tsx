import { Badge, Button, Card, DataTable } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import { date, phoneDisplay } from "@/utils/format";

interface Entry {
  _id: string;
  date: string;
  status: "waiting" | "offered" | "booked" | "expired" | "cancelled";
  client: { name: string; phone: string };
  service: { name: string };
  barber?: { name: string };
  location: { name: string };
}

const LABELS: Record<Entry["status"], [string, "neutral" | "warning" | "success" | "danger" | "info"]> = {
  waiting: ["Esperando", "warning"],
  offered: ["Horario ofrecido", "info"],
  booked: ["Tomó el turno", "success"],
  expired: ["No llegó a tiempo", "neutral"],
  cancelled: ["Quitado", "danger"],
};

export default function WaitlistPage() {
  const { data, isLoading } = useAdminQuery<{ items: Entry[] }>("waitlist", undefined, { refetchInterval: 30_000 });
  const cancel = useAdminAction((id: string) => adminApi.post(`waitlist/${id}/cancel`), { success: "Quitado de la lista" });
  return (
    <>
      <PageHeader title="Lista de espera" subtitle="Clientes que esperan un hueco. Si alguien cancela, el primero recibe el aviso y tiene 15 minutos para tomarlo." />
      <Card tone="light" padded={false}>
        <DataTable
          loading={isLoading}
          rows={data?.items}
          rowKey={(e) => e._id}
          columns={[
            { key: "d", header: "Día", render: (e) => date(`${e.date}T12:00:00-03:00`) },
            { key: "c", header: "Cliente", render: (e) => <>{e.client.name}<div><small>{phoneDisplay(e.client.phone)}</small></div></> },
            { key: "s", header: "Servicio", render: (e) => e.service.name, hideOnMobile: true },
            { key: "b", header: "Barbero", render: (e) => e.barber?.name ?? "Cualquiera", hideOnMobile: true },
            { key: "l", header: "Sede", render: (e) => e.location.name, hideOnMobile: true },
            { key: "st", header: "Estado", render: (e) => <Badge tone={LABELS[e.status][1]}>{LABELS[e.status][0]}</Badge> },
            { key: "a", header: "", render: (e) => (e.status === "waiting" ? <Button size="sm" variant="light" onClick={() => cancel.mutate(e._id)}>Quitar</Button> : null) },
          ]}
        />
      </Card>
    </>
  );
}
