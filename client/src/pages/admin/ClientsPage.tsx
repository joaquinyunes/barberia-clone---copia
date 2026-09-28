import { useNavigate } from "react-router-dom";
import { Badge, Button } from "@/components/ui";
import { ResourcePage } from "@/features/admin/components/ResourcePage/ResourcePage";
import { useAdminQuery } from "@/features/admin/hooks/useAdmin";
import { date, phoneDisplay, waHref } from "@/utils/format";

interface Client {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  tier: string;
  visits: number;
  lastVisitAt?: string;
  source?: string;
  referralCode?: string;
  preferredBarber?: { _id: string; name: string };
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const { data: atRisk } = useAdminQuery<unknown[]>("reports/at-risk-clients");
  return (
    <ResourcePage<Client>
      title="Clientes"
      subtitle={atRisk?.length ? `${atRisk.length} clientes no vuelven hace más de lo habitual (ver Reportes → Clientes en riesgo)` : undefined}
      resource="clients"
      singular="cliente"
      searchPlaceholder="Nombre, teléfono, email o código"
      onRowClick={(c) => navigate(`/admin/clientes/${c._id}`)}
      columns={[
        { key: "n", header: "Cliente", render: (c) => <strong>{c.name}</strong> },
        { key: "p", header: "Celular", render: (c) => <a href={waHref(c.phone)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{phoneDisplay(c.phone)}</a> },
        { key: "t", header: "Nivel", render: (c) => <Badge tone={c.tier === "premium" ? "gold" : c.tier === "frecuente" ? "info" : "neutral"}>{c.tier}</Badge> },
        { key: "v", header: "Visitas", align: "right", render: (c) => c.visits },
        { key: "l", header: "Última visita", render: (c) => date(c.lastVisitAt), hideOnMobile: true },
        { key: "b", header: "Barbero habitual", render: (c) => c.preferredBarber?.name ?? "—", hideOnMobile: true },
        { key: "s", header: "Origen", render: (c) => c.source, hideOnMobile: true },
      ]}
      rowActions={(c) => <Button size="sm" variant="light" onClick={() => navigate(`/admin/clientes/${c._id}`)}>Ficha</Button>}
      fields={[
        { name: "name", label: "Nombre y apellido", required: true },
        { name: "phone", label: "Celular", type: "tel", required: true, hint: "Con código de área. Ej: 11 5555 5555" },
        { name: "email", label: "Email", type: "email" },
        { name: "dni", label: "DNI" },
        { name: "birthday", label: "Cumpleaños", type: "date" },
        { name: "source", label: "Origen", type: "select", options: ["web", "walkin", "instagram", "referido", "tienda", "admin"].map((v) => ({ value: v, label: v })) },
        { name: "creditLimit", label: "Tope de deuda (vacío = general)", type: "money" },
        { name: "tags", label: "Etiquetas", type: "list" },
        { name: "blocked", label: "Bloquear reservas online", type: "checkbox" },
      ]}
    />
  );
}
