import { useState } from "react";
import { Badge, Button, Card, Checkbox, DataTable, Input, Modal, Select, Tabs } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { useAdminStore } from "@/features/admin/adminStore";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { PackPlan, Paged } from "@/types";
import { date, money } from "@/utils/format";
import { METHOD_LABELS } from "@/utils/labels";
import { AllowanceEditor, type Allowance } from "./commercial.shared";
import { ClientPicker } from "./MembershipsPage";
import styles from "./admin.module.css";

interface ClientPack { _id: string; code: string; name: string; client: { name: string }; usage: { label: string; used: number; total: number }[]; expiresAt: string; status: string; pricePaid?: number }

export default function PacksPage() {
  const [tab, setTab] = useState("emitidos");
  const [edit, setEdit] = useState<PackPlan | "new" | null>(null);
  const [issue, setIssue] = useState(false);
  const { data: plans } = useAdminQuery<Paged<PackPlan>>("pack-plans");
  const { data: packs, isLoading } = useAdminQuery<{ items: ClientPack[] }>("commercial/packs");
  return (
    <>
      <PageHeader title="Packs y bonos" subtitle="Pack 10 cortes, padre e hijo, corte + barba… con control de consumo." actions={<><Button variant="light" onClick={() => setEdit("new")}>Nuevo pack</Button><Button onClick={() => setIssue(true)}>Emitir bono</Button></>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "emitidos", label: "Bonos emitidos", count: packs?.items.length }, { value: "planes", label: "Tipos de pack", count: plans?.items.length }]} />
      {tab === "emitidos" && (
        <Card tone="light" padded={false}>
          <DataTable loading={isLoading} rows={packs?.items} rowKey={(p) => p._id} columns={[
            { key: "c", header: "Bono", render: (p) => <><strong>{p.code}</strong><div className={styles.small}>{p.name}</div></> },
            { key: "cl", header: "Cliente", render: (p) => p.client?.name },
            { key: "u", header: "Consumo", render: (p) => p.usage.map((u) => `${u.label}: ${u.used}/${u.total}`).join(" · ") },
            { key: "e", header: "Vence", render: (p) => date(p.expiresAt), hideOnMobile: true },
            { key: "s", header: "Estado", render: (p) => <Badge tone={p.status === "active" ? "success" : "neutral"}>{p.status === "active" ? "Activo" : p.status === "used" ? "Consumido" : p.status}</Badge> },
          ]} />
        </Card>
      )}
      {tab === "planes" && (
        <div className={styles.threeCols}>
          {plans?.items.map((p) => (
            <Card key={p._id} tone="light" title={p.name} actions={<Button size="sm" variant="light" onClick={() => setEdit(p)}>Editar</Button>}>
              <p><strong>{money(p.price)}</strong> · vence a los {p.validityDays} días</p>
              <p className={styles.small}>{p.items.map((i) => `${i.quantity} ${i.label}`).join(" + ")}</p>
            </Card>
          ))}
        </div>
      )}
      {edit && <PackPlanModal plan={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
      {issue && <IssueModal plans={plans?.items ?? []} onClose={() => setIssue(false)} />}
    </>
  );
}

function PackPlanModal({ plan, onClose }: { plan?: PackPlan; onClose: () => void }) {
  const [f, setF] = useState({ name: plan?.name ?? "", description: plan?.description ?? "", price: plan?.price ?? 0, validityDays: plan?.validityDays ?? 180, shop: true });
  const [items, setItems] = useState<Allowance[]>(plan?.items ?? []);
  const save = useAdminAction(() => (plan ? adminApi.update("pack-plans", plan._id, { ...f, items }) : adminApi.create("pack-plans", { ...f, items })), { success: "Pack guardado", onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title={plan ? "Editar pack" : "Nuevo pack"} footer={<Button disabled={!f.name || !items.length} loading={save.isPending} onClick={() => save.mutate(undefined)}>Guardar</Button>}>
      <div className={styles.stack}>
        <div className={styles.formGrid}>
          <Input tone="light" label="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input tone="light" label="Precio" type="number" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} />
          <Input tone="light" label="Validez (días)" type="number" value={f.validityDays} onChange={(e) => setF({ ...f, validityDays: Number(e.target.value) })} />
          <Input tone="light" label="Descripción" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <AllowanceEditor value={items} onChange={setItems} />
        <Checkbox tone="light" label="Vender en la tienda online" checked={f.shop} onChange={(e) => setF({ ...f, shop: e.target.checked })} />
      </div>
    </Modal>
  );
}

function IssueModal({ plans, onClose }: { plans: PackPlan[]; onClose: () => void }) {
  const location = useAdminStore((s) => s.location);
  const [client, setClient] = useState("");
  const [plan, setPlan] = useState(plans[0]?._id ?? "");
  const [method, setMethod] = useState("none");
  const save = useAdminAction(() => adminApi.post<{ code: string }>("commercial/packs", { client, plan, sale: method === "none" ? undefined : { method, location } }), { success: (r) => `Bono ${r.code} emitido`, onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Emitir bono" size="sm" footer={<Button disabled={!client || !plan} loading={save.isPending} onClick={() => save.mutate(undefined)}>Emitir</Button>}>
      <div className={styles.stack}>
        <ClientPicker value={client} onChange={setClient} />
        <Select tone="light" label="Pack" value={plan} onChange={(e) => setPlan(e.target.value)} options={plans.map((p) => ({ value: p._id, label: `${p.name} · ${money(p.price)}` }))} />
        <Select tone="light" label="Cobro" value={method} onChange={(e) => setMethod(e.target.value)} options={[{ value: "none", label: "Sin cobro (regalo / compensación)" }, ...["cash", "transfer", "mercadopago", "card"].map((m) => ({ value: m, label: METHOD_LABELS[m] }))]} />
      </div>
    </Modal>
  );
}
