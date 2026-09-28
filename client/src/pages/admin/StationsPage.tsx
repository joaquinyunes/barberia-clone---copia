import { Badge, Button } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { ResourcePage } from "@/features/admin/components/ResourcePage/ResourcePage";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import { useLocations } from "@/features/catalog/useCatalog";
import type { Paged } from "@/types";
import { dateTime } from "@/utils/format";

interface Station { _id: string; name: string; status: string; location?: { _id: string; name: string }; barber?: { _id: string; name: string }; lastCleaningAt?: string; notes?: string }
const STATUS: Record<string, { label: string; tone: "success" | "info" | "warning" | "danger" }> = {
  available: { label: "Libre", tone: "success" }, occupied: { label: "Asignado", tone: "info" }, maintenance: { label: "Mantenimiento", tone: "warning" }, out_of_service: { label: "Fuera de servicio", tone: "danger" },
};

export default function StationsPage() {
  const { data: locations } = useLocations();
  const { data: barbers } = useAdminQuery<Paged<{ _id: string; name: string }>>("barbers", { limit: 100 });
  const clean = useAdminAction((id: string) => adminApi.post(`stations/${id}/clean`), { success: "Limpieza registrada" });
  return (
    <ResourcePage<Station>
      title="Puestos"
      subtitle="Cada sillón con su estado, barbero asignado y registro de limpieza."
      resource="stations"
      singular="puesto"
      defaults={{ status: "available" }}
      columns={[
        { key: "n", header: "Puesto", render: (s) => <strong>{s.name}</strong> },
        { key: "l", header: "Sede", render: (s) => s.location?.name },
        { key: "b", header: "Barbero", render: (s) => s.barber?.name ?? "—" },
        { key: "s", header: "Estado", render: (s) => <Badge tone={STATUS[s.status]?.tone}>{STATUS[s.status]?.label}</Badge> },
        { key: "c", header: "Última limpieza", render: (s) => dateTime(s.lastCleaningAt), hideOnMobile: true },
      ]}
      rowActions={(s) => <Button size="sm" variant="ghost" onClick={() => clean.mutate(s._id)}>Limpio ✓</Button>}
      fields={[
        { name: "name", label: "Nombre", required: true, placeholder: "Puesto 1" },
        { name: "location", label: "Sede", type: "select", required: true, options: (locations ?? []).map((l) => ({ value: l._id, label: l.name })) },
        { name: "barber", label: "Barbero asignado", type: "select", options: (barbers?.items ?? []).map((b) => ({ value: b._id, label: b.name })) },
        { name: "status", label: "Estado", type: "select", required: true, options: Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label })) },
        { name: "notes", label: "Notas", type: "textarea", span: 2 },
      ]}
    />
  );
}
