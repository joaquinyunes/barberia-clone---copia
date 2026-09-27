import { Badge } from "@/components/ui";
import { ResourcePage } from "@/features/admin/components/ResourcePage/ResourcePage";
import { useServices } from "@/features/catalog/useCatalog";
import { date, money } from "@/utils/format";
import { DAYS_SHORT } from "@/utils/labels";

interface Promotion { _id: string; name: string; code?: string; type: string; value: number; days?: number[]; timeFrom?: string; timeTo?: string; uses: number; maxUses?: number; validTo?: string; automatic?: boolean; active?: boolean; newClientsOnly?: boolean }

export default function PromotionsPage() {
  const { data: services } = useServices();
  return (
    <ResourcePage<Promotion>
      title="Promociones"
      subtitle="Códigos (CORTE10) y promos automáticas por día y horario (happy hour). Se validan solas al reservar."
      resource="promotions"
      singular="promoción"
      defaults={{ type: "percent", value: 10, active: true }}
      transform={(p) => ({ ...p, days: Array.isArray(p.days) ? (p.days as string[]).map(Number) : [] })}
      toForm={(p) => ({ ...p, days: (p.days ?? []).map(String) })}
      columns={[
        { key: "n", header: "Promoción", render: (p) => <strong>{p.name}</strong> },
        { key: "c", header: "Código", render: (p) => (p.automatic ? <Badge tone="gold">Automática</Badge> : p.code ?? "—") },
        { key: "v", header: "Descuento", render: (p) => (p.type === "percent" ? `${p.value}%` : p.type === "fixed" ? `−${money(p.value)}` : `Precio ${money(p.value)}`) },
        { key: "w", header: "Cuándo", render: (p) => [p.days?.length ? p.days.map((d) => DAYS_SHORT[d]).join(", ") : "Todos los días", p.timeFrom && `${p.timeFrom}–${p.timeTo}`].filter(Boolean).join(" · "), hideOnMobile: true },
        { key: "u", header: "Usos", align: "right", render: (p) => `${p.uses}${p.maxUses ? `/${p.maxUses}` : ""}` },
        { key: "t", header: "Vence", render: (p) => date(p.validTo), hideOnMobile: true },
        { key: "a", header: "", render: (p) => (p.active === false ? <Badge>Inactiva</Badge> : null) },
      ]}
      fields={[
        { name: "name", label: "Nombre", required: true },
        { name: "code", label: "Código (vacío = automática)", placeholder: "CORTE10" },
        { name: "type", label: "Tipo", type: "select", required: true, options: [{ value: "percent", label: "Porcentaje" }, { value: "fixed", label: "Monto fijo de descuento" }, { value: "fixed_price", label: "Precio final fijo" }] },
        { name: "value", label: "Valor", type: "number", required: true },
        { name: "days", label: "Días válidos (ninguno = todos)", type: "multiselect", options: DAYS_SHORT.map((d, i) => ({ value: String(i), label: d })) },
        { name: "timeFrom", label: "Desde (hora)", type: "time" },
        { name: "timeTo", label: "Hasta (hora)", type: "time" },
        { name: "services", label: "Servicios válidos (ninguno = todos)", type: "multiselect", options: (services ?? []).map((s) => ({ value: s._id, label: s.name })) },
        { name: "minAmount", label: "Monto mínimo", type: "money" },
        { name: "maxUses", label: "Usos totales máximos", type: "number" },
        { name: "maxUsesPerClient", label: "Usos por cliente", type: "number" },
        { name: "validFrom", label: "Válida desde", type: "date" },
        { name: "validTo", label: "Vence", type: "date" },
        { name: "automatic", label: "Aplicar automáticamente (sin código)", type: "checkbox" },
        { name: "newClientsOnly", label: "Solo clientes nuevos", type: "checkbox" },
        { name: "active", label: "Activa", type: "checkbox" },
        { name: "description", label: "Descripción", type: "textarea", span: 2 },
      ]}
    />
  );
}
