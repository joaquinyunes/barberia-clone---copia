import { useNavigate } from "react-router-dom";
import { Badge, Button } from "@/components/ui";
import { ResourcePage } from "@/features/admin/components/ResourcePage/ResourcePage";
import { useLocations } from "@/features/catalog/useCatalog";
import { date } from "@/utils/format";
import { BARBER_STATUS } from "@/utils/labels";

interface Barber {
  _id: string;
  name: string;
  phone?: string;
  dni?: string;
  status: string;
  hiredAt?: string;
  location?: { _id: string; name: string };
  specialties?: string[];
  defaultCommissionPct?: number;
}

const tone = (s: string) => (s === "active" ? "success" : s === "vacation" || s === "leave" ? "warning" : s === "suspended" ? "danger" : "neutral");

export default function BarbersPage() {
  const navigate = useNavigate();
  const { data: locations } = useLocations();
  return (
    <ResourcePage<Barber>
      title="Barberos"
      subtitle="Hacé clic en un barbero para ver su cuenta, liquidación, objetivos y asistencia."
      resource="barbers"
      singular="barbero"
      canDelete={false}
      onRowClick={(b) => navigate(`/admin/barberos/${b._id}`)}
      defaults={{ status: "active", defaultCommissionPct: 50 }}
      transform={(p) => ({ ...p, slug: p.slug ?? String(p.name).toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })}
      columns={[
        { key: "n", header: "Barbero", render: (b) => <strong>{b.name}</strong> },
        { key: "l", header: "Sede", render: (b) => b.location?.name ?? "—" },
        { key: "s", header: "Estado", render: (b) => <Badge tone={tone(b.status)}>{BARBER_STATUS[b.status]}</Badge> },
        { key: "c", header: "Comisión base", align: "right", render: (b) => (b.defaultCommissionPct !== undefined ? `${b.defaultCommissionPct}%` : "General"), hideOnMobile: true },
        { key: "h", header: "Ingreso", render: (b) => date(b.hiredAt), hideOnMobile: true },
        { key: "e", header: "Especialidades", render: (b) => b.specialties?.join(", "), hideOnMobile: true },
      ]}
      rowActions={(b) => <Button size="sm" variant="light" onClick={() => navigate(`/admin/barberos/${b._id}`)}>Ficha</Button>}
      fields={[
        { name: "name", label: "Nombre y apellido", required: true },
        { name: "location", label: "Sede", type: "select", required: true, options: (locations ?? []).map((l) => ({ value: l._id, label: l.name })) },
        { name: "phone", label: "Teléfono", type: "tel" },
        { name: "dni", label: "DNI" },
        { name: "hiredAt", label: "Fecha de ingreso", type: "date" },
        { name: "status", label: "Estado", type: "select", required: true, options: Object.entries(BARBER_STATUS).map(([value, label]) => ({ value, label })) },
        { name: "defaultCommissionPct", label: "Comisión base (%)", type: "number", hint: "Se usa si el servicio no tiene comisión propia" },
        { name: "hourlyRate", label: "Valor hora extra", type: "money" },
        { name: "monthlyHours", label: "Horas mensuales pactadas", type: "number" },
        { name: "attendancePin", label: "PIN de fichaje (4-6 dígitos)", hint: "Para marcar entrada/salida en la tablet del local" },
        { name: "specialties", label: "Especialidades", type: "list" },
        { name: "instagram", label: "Instagram" },
        { name: "photo", label: "Foto (URL)", placeholder: "/images/barbers/nombre.webp" },
        { name: "bio", label: "Bio pública", type: "textarea", span: 2 },
        { name: "public", label: "Mostrar en el sitio", type: "checkbox" },
      ]}
    />
  );
}
