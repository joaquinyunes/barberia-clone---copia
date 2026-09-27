import { useState } from "react";
import { Badge, Button, Checkbox, DataTable, Input, Modal } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { ResourcePage } from "@/features/admin/components/ResourcePage/ResourcePage";
import { useAdminAction } from "@/features/admin/hooks/useAdmin";
import { useLocations } from "@/features/catalog/useCatalog";
import type { Service } from "@/types";
import { date, money } from "@/utils/format";
import { CATEGORY_LABELS } from "@/utils/labels";
import styles from "./admin.module.css";

export default function ServicesAdminPage() {
  const { data: locations } = useLocations();
  const [bulk, setBulk] = useState(false);
  const [history, setHistory] = useState<Service | null>(null);
  return (
    <>
      <ResourcePage<Service & { commissionType?: string; commissionValue?: number }>
        title="Servicios y precios"
        subtitle="Precio, duración, costo de insumos y comisión propia de cada servicio. Los cambios de precio quedan en el historial."
        resource="services"
        singular="servicio"
        headerActions={<Button variant="light" onClick={() => setBulk(true)}>Actualizar precios en %</Button>}
        defaults={{ category: "corte", durationMin: 45, active: true }}
        toForm={(s) => ({ ...s, commissionType: s.commission?.type ?? "", commissionValue: s.commission?.value })}
        transform={(p) => {
          const { commissionType, commissionValue, ...rest } = p as Record<string, unknown>;
          return {
            ...rest,
            slug: rest.slug ?? String(rest.name).toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
            commission: commissionType ? { type: commissionType, value: Number(commissionValue ?? 0) } : null,
          };
        }}
        columns={[
          { key: "n", header: "Servicio", render: (s) => <><strong>{s.name}</strong><div className={styles.small}>{CATEGORY_LABELS[s.category]}</div></> },
          { key: "d", header: "Duración", render: (s) => `${s.durationMin} min`, hideOnMobile: true },
          { key: "p", header: "Precio", align: "right", render: (s) => money(s.price) },
          { key: "c", header: "Comisión", render: (s) => (s.commission?.type ? (s.commission.type === "fixed" ? money(s.commission.value) : `${s.commission.value}%`) : "Según barbero"), hideOnMobile: true },
          { key: "i", header: "Insumos", align: "right", render: (s) => money(s.supplyCost), hideOnMobile: true },
          { key: "a", header: "", render: (s) => (s.active === false ? <Badge>Inactivo</Badge> : null) },
        ]}
        rowActions={(s) => <Button size="sm" variant="ghost" onClick={() => setHistory(s)}>Precios</Button>}
        fields={[
          { name: "name", label: "Nombre", required: true },
          { name: "category", label: "Categoría", type: "select", required: true, options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })) },
          { name: "price", label: "Precio", type: "money", required: true },
          { name: "durationMin", label: "Duración (min)", type: "number", required: true },
          { name: "supplyCost", label: "Costo de insumos", type: "money", hint: "Cuchilla, toalla, producto: para calcular el margen real" },
          { name: "commissionType", label: "Comisión propia", type: "select", options: [{ value: "fixed", label: "Monto fijo" }, { value: "percent", label: "Porcentaje" }], hint: "Vacío = usa la del barbero" },
          { name: "commissionValue", label: "Valor de la comisión", type: "number" },
          { name: "description", label: "Descripción", type: "textarea", span: 2 },
          { name: "includes", label: "Incluye", type: "list" },
          { name: "image", label: "Imagen (URL)" },
          { name: "locations", label: "Sedes (ninguna = todas)", type: "multiselect", options: (locations ?? []).map((l) => ({ value: l._id, label: l.name })) },
          { name: "featured", label: "Destacado en la home", type: "checkbox" },
          { name: "active", label: "Activo", type: "checkbox" },
        ]}
      />
      {bulk && <BulkPriceModal onClose={() => setBulk(false)} />}
      {history && (
        <Modal open onClose={() => setHistory(null)} title={`Historial de precios · ${history.name}`} size="sm">
          <ul className={styles.lines}>
            {[...(history.priceHistory ?? [])].reverse().map((h, i) => <li key={i}><span>{date(h.from)} {h.changedBy && `· ${h.changedBy}`}</span><strong>{money(h.price)}</strong></li>)}
          </ul>
        </Modal>
      )}
    </>
  );
}

/** "Modo inflación": aumento masivo por %, con redondeo y vista previa. */
function BulkPriceModal({ onClose }: { onClose: () => void }) {
  const [percent, setPercent] = useState(10);
  const [step, setStep] = useState(500);
  const [cats, setCats] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ id: string; name: string; from: number; to: number }[]>();
  const run = useAdminAction((dryRun: boolean) => adminApi.post<{ preview: typeof preview; applied: boolean }>("services/bulk-price", { percent, roundTo: step, categories: cats.length ? cats : undefined, dryRun }), {
    onSuccess: (r) => (r.applied ? onClose() : setPreview(r.preview)),
    success: (r) => (r.applied ? "Precios actualizados" : "Vista previa lista"),
  });
  return (
    <Modal open onClose={onClose} title="Actualizar precios" footer={<><Button variant="light" onClick={() => run.mutate(true)}>Ver vista previa</Button><Button disabled={!preview} loading={run.isPending} onClick={() => run.mutate(false)}>Aplicar</Button></>}>
      <div className={styles.stack}>
        <div className={styles.formGrid}>
          <Input tone="light" label="Aumento (%)" type="number" value={percent} onChange={(e) => { setPercent(Number(e.target.value)); setPreview(undefined); }} />
          <Input tone="light" label="Redondear a" type="number" value={step} onChange={(e) => { setStep(Number(e.target.value)); setPreview(undefined); }} />
        </div>
        <div className={styles.chips}>
          {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
            <Checkbox key={k} tone="light" label={l} checked={cats.includes(k)} onChange={(e) => { setCats(e.target.checked ? [...cats, k] : cats.filter((c) => c !== k)); setPreview(undefined); }} />
          ))}
        </div>
        {preview && <DataTable rows={preview} rowKey={(p) => p.id} columns={[
          { key: "n", header: "Servicio", render: (p) => p.name },
          { key: "f", header: "Antes", align: "right", render: (p) => money(p.from) },
          { key: "t", header: "Después", align: "right", render: (p) => <strong>{money(p.to)}</strong> },
        ]} />}
      </div>
    </Modal>
  );
}
