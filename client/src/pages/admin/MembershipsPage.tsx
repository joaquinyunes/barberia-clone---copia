import { useState } from "react";
import { Badge, Button, Card, Checkbox, DataTable, Input, Modal, Select, Tabs, Textarea } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { useAdminStore } from "@/features/admin/adminStore";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { MembershipPlan, Paged } from "@/types";
import { date, money } from "@/utils/format";
import { METHOD_LABELS } from "@/utils/labels";
import { AllowanceEditor, type Allowance } from "./commercial.shared";
import styles from "./admin.module.css";

interface Membership { _id: string; client: { _id: string; name: string; phone: string }; plan: { name: string; price: number }; status: string; renewsAt: string; usage: { label: string; used: number; total: number }[] }

export default function MembershipsPage() {
  const [tab, setTab] = useState("socios");
  const [plan, setPlan] = useState<MembershipPlan | "new" | null>(null);
  const [subscribe, setSubscribe] = useState(false);
  const location = useAdminStore((s) => s.location);
  const { data: plans } = useAdminQuery<Paged<MembershipPlan>>("membership-plans");
  const { data: members, isLoading } = useAdminQuery<{ items: Membership[] }>("commercial/memberships");
  const renew = useAdminAction(({ id, method }: { id: string; method: string }) => adminApi.post(`commercial/memberships/${id}/renew`, { method, location }), { success: "Membresía renovada" });
  const setStatus = useAdminAction(({ id, status }: { id: string; status: string }) => adminApi.post(`commercial/memberships/${id}/status`, { status }), { success: "Estado actualizado" });
  return (
    <>
      <PageHeader title="Membresías" subtitle="Club Jack: cupos mensuales, renovación y control de uso." actions={<><Button variant="light" onClick={() => setPlan("new")}>Nuevo plan</Button><Button onClick={() => setSubscribe(true)}>Alta de socio</Button></>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "socios", label: "Socios", count: members?.items.length }, { value: "planes", label: "Planes", count: plans?.items.length }]} />
      {tab === "socios" && (
        <Card tone="light" padded={false}>
          <DataTable loading={isLoading} rows={members?.items} rowKey={(m) => m._id} columns={[
            { key: "c", header: "Socio", render: (m) => m.client?.name },
            { key: "p", header: "Plan", render: (m) => m.plan?.name },
            { key: "u", header: "Uso del mes", render: (m) => m.usage.map((u) => `${u.label} ${u.used}/${u.total}`).join(" · ") },
            { key: "r", header: "Renueva", render: (m) => <span className={new Date(m.renewsAt) < new Date() ? styles.dangerText : undefined}>{date(m.renewsAt)}</span> },
            { key: "s", header: "Estado", render: (m) => <Badge tone={m.status === "active" ? "success" : m.status === "expired" ? "danger" : "neutral"}>{m.status}</Badge> },
            { key: "a", header: "", align: "right", render: (m) => (
              <div className={styles.row} style={{ justifyContent: "flex-end" }}>
                <Button size="sm" variant="light" onClick={() => { const method = window.prompt("Medio de pago (cash, transfer, mercadopago, card)", "mercadopago"); if (method) renew.mutate({ id: m._id, method }); }}>Renovar</Button>
                {m.status === "active" ? <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: m._id, status: "paused" })}>Pausar</Button> : <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: m._id, status: "active" })}>Activar</Button>}
              </div>
            ) },
          ]} />
        </Card>
      )}
      {tab === "planes" && (
        <div className={styles.threeCols}>
          {plans?.items.map((p) => (
            <Card key={p._id} tone="light" title={p.name} actions={<Button size="sm" variant="light" onClick={() => setPlan(p)}>Editar</Button>}>
              <p><strong>{money(p.price)}</strong>/mes</p>
              <p className={styles.small}>{p.items.map((i) => `${i.quantity} ${i.label}`).join(" + ")} · {p.productDiscountPct ?? 0}% en productos{p.priorityBooking ? " · prioridad" : ""}{p.priceLock ? " · precio congelado" : ""}</p>
            </Card>
          ))}
        </div>
      )}
      {plan && <PlanModal plan={plan === "new" ? undefined : plan} onClose={() => setPlan(null)} />}
      {subscribe && <SubscribeModal plans={plans?.items ?? []} onClose={() => setSubscribe(false)} />}
    </>
  );
}

function PlanModal({ plan, onClose }: { plan?: MembershipPlan; onClose: () => void }) {
  const [f, setF] = useState({ name: plan?.name ?? "", description: plan?.description ?? "", price: plan?.price ?? 0, productDiscountPct: plan?.productDiscountPct ?? 10, priorityBooking: plan?.priorityBooking ?? true, priceLock: plan?.priceLock ?? true });
  const [items, setItems] = useState<Allowance[]>(plan?.items ?? []);
  const save = useAdminAction(() => (plan ? adminApi.update("membership-plans", plan._id, { ...f, items }) : adminApi.create("membership-plans", { ...f, items })), { success: "Plan guardado", onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title={plan ? "Editar plan" : "Nuevo plan"} footer={<Button loading={save.isPending} disabled={!f.name || !items.length} onClick={() => save.mutate(undefined)}>Guardar</Button>}>
      <div className={styles.stack}>
        <div className={styles.formGrid}>
          <Input tone="light" label="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input tone="light" label="Precio mensual" type="number" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} />
          <Input tone="light" label="% en productos" type="number" value={f.productDiscountPct} onChange={(e) => setF({ ...f, productDiscountPct: Number(e.target.value) })} />
        </div>
        <Textarea tone="light" label="Descripción" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <h4>Incluye por mes</h4>
        <AllowanceEditor value={items} onChange={setItems} />
        <Checkbox tone="light" label="Prioridad en la agenda" checked={f.priorityBooking} onChange={(e) => setF({ ...f, priorityBooking: e.target.checked })} />
        <Checkbox tone="light" label="Precio congelado ante aumentos" checked={f.priceLock} onChange={(e) => setF({ ...f, priceLock: e.target.checked })} />
      </div>
    </Modal>
  );
}

export function ClientPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [q, setQ] = useState("");
  const { data } = useAdminQuery<Paged<{ _id: string; name: string; phone: string }>>("clients", { search: q || undefined, limit: 20 }, { enabled: q.length >= 2 });
  return (
    <div className={styles.stack}>
      <Input tone="light" label="Buscar cliente" placeholder="Nombre o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
      {data && <Select tone="light" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Elegí" options={data.items.map((c) => ({ value: c._id, label: `${c.name} · ${c.phone}` }))} />}
    </div>
  );
}

function SubscribeModal({ plans, onClose }: { plans: MembershipPlan[]; onClose: () => void }) {
  const location = useAdminStore((s) => s.location);
  const [client, setClient] = useState("");
  const [plan, setPlan] = useState(plans[0]?._id ?? "");
  const [method, setMethod] = useState("mercadopago");
  const save = useAdminAction(() => adminApi.post("commercial/memberships", { client, plan, payment: { method, location } }), { success: "Socio dado de alta", onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Alta de socio" size="sm" footer={<Button disabled={!client || !plan || !location} loading={save.isPending} onClick={() => save.mutate(undefined)}>Dar de alta y cobrar</Button>}>
      <div className={styles.stack}>
        <ClientPicker value={client} onChange={setClient} />
        <Select tone="light" label="Plan" value={plan} onChange={(e) => setPlan(e.target.value)} options={plans.map((p) => ({ value: p._id, label: `${p.name} · ${money(p.price)}` }))} />
        <Select tone="light" label="Primer pago" value={method} onChange={(e) => setMethod(e.target.value)} options={["mercadopago", "transfer", "cash", "card"].map((m) => ({ value: m, label: METHOD_LABELS[m] }))} />
      </div>
    </Modal>
  );
}
