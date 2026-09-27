import { Badge, Button, Card, DataTable } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import { dateTime } from "@/utils/format";

interface Msg { _id: string; name: string; email: string; phone?: string; message: string; handled: boolean; createdAt: string; location?: { name: string } }

export default function MessagesPage() {
  const { data, isLoading } = useAdminQuery<{ items: Msg[] }>("contact");
  const toggle = useAdminAction((m: Msg) => adminApi.patch(`contact/${m._id}`, { handled: !m.handled }));
  return (
    <>
      <PageHeader title="Mensajes" subtitle="Formulario de contacto y suscripciones al newsletter." />
      <Card tone="light" padded={false}>
        <DataTable loading={isLoading} rows={data?.items} rowKey={(m) => m._id} columns={[
          { key: "d", header: "Fecha", render: (m) => dateTime(m.createdAt) },
          { key: "n", header: "De", render: (m) => <>{m.name}<div style={{ fontSize: ".75rem", color: "#6d6558" }}>{m.email} {m.phone}</div></> },
          { key: "m", header: "Mensaje", render: (m) => m.message },
          { key: "s", header: "", render: (m) => <Button size="sm" variant="ghost" onClick={() => toggle.mutate(m)}>{m.handled ? <Badge tone="success">Respondido</Badge> : "Marcar respondido"}</Button> },
        ]} />
      </Card>
    </>
  );
}
