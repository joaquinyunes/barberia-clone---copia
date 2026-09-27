import { useState } from "react";
import { Badge, Button, Card, DataTable, Input, Modal, Select, Stat } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { useAdminStore } from "@/features/admin/adminStore";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import { date, money } from "@/utils/format";
import { METHOD_LABELS } from "@/utils/labels";
import styles from "./admin.module.css";

interface GiftCard { _id: string; code: string; initialValue: number; balance: number; status: string; expiresAt?: string; recipientName?: string; buyer?: { name: string }; redemptions: { amount: number; date: string; ref?: string }[] }

export default function GiftCardsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useAdminQuery<{ items: GiftCard[]; liability: number }>("commercial/giftcards", { search: search || undefined });
  const voidIt = useAdminAction((id: string) => adminApi.post(`commercial/giftcards/${id}/void`), { success: "Gift card anulada" });
  return (
    <>
      <PageHeader title="Gift cards" subtitle="Saldo disponible, canjes parciales y vencimiento." actions={<Button onClick={() => setOpen(true)}>Emitir gift card</Button>} />
      <div className={styles.stats}>
        <Stat label="Saldo pendiente de canje" value={money(data?.liability)} tone="warning" hint="Lo que la barbería debe en servicios" />
        <Stat label="Activas" value={data?.items.filter((g) => g.status === "active").length ?? 0} />
      </div>
      <div className={styles.row} style={{ marginBottom: "1rem" }}>
        <input className={styles.input} placeholder="Buscar código GFT-…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar" />
      </div>
      <Card tone="light" padded={false}>
        <DataTable loading={isLoading} rows={data?.items} rowKey={(g) => g._id} columns={[
          { key: "c", header: "Código", render: (g) => <strong>{g.code}</strong> },
          { key: "v", header: "Valor", align: "right", render: (g) => money(g.initialValue) },
          { key: "b", header: "Saldo", align: "right", render: (g) => <strong>{money(g.balance)}</strong> },
          { key: "p", header: "Para / compró", render: (g) => [g.recipientName, g.buyer?.name].filter(Boolean).join(" · ") || "—", hideOnMobile: true },
          { key: "u", header: "Canjes", render: (g) => g.redemptions.map((r) => `${money(r.amount)} (${date(r.date)})`).join(", ") || "—", hideOnMobile: true },
          { key: "e", header: "Vence", render: (g) => date(g.expiresAt) },
          { key: "s", header: "Estado", render: (g) => <Badge tone={g.status === "active" ? "success" : g.status === "used" ? "neutral" : "danger"}>{g.status === "active" ? "Disponible" : g.status === "used" ? "Usada" : g.status === "expired" ? "Vencida" : "Anulada"}</Badge> },
          { key: "x", header: "", render: (g) => g.status === "active" && <Button size="sm" variant="ghost" onClick={() => window.confirm("¿Anular esta gift card?") && voidIt.mutate(g._id)}>Anular</Button> },
        ]} />
      </Card>
      {open && <IssueGiftCard onClose={() => setOpen(false)} />}
    </>
  );
}

function IssueGiftCard({ onClose }: { onClose: () => void }) {
  const location = useAdminStore((s) => s.location);
  const [f, setF] = useState({ value: 30000, recipientName: "", method: "cash", validityDays: 365 });
  const save = useAdminAction(
    () => adminApi.post<GiftCard>("commercial/giftcards", { value: f.value, recipientName: f.recipientName || undefined, validityDays: f.validityDays, sale: f.method === "none" ? undefined : { method: f.method, location } }),
    { success: (g) => `Gift card ${g.code} emitida`, onSuccess: onClose },
  );
  return (
    <Modal open onClose={onClose} title="Emitir gift card" size="sm" footer={<Button disabled={!(f.value > 0)} loading={save.isPending} onClick={() => save.mutate(undefined)}>Emitir</Button>}>
      <div className={styles.stack}>
        <Input tone="light" label="Valor" type="number" value={f.value} onChange={(e) => setF({ ...f, value: Number(e.target.value) })} />
        <Input tone="light" label="Para (opcional)" value={f.recipientName} onChange={(e) => setF({ ...f, recipientName: e.target.value })} />
        <Input tone="light" label="Validez (días)" type="number" value={f.validityDays} onChange={(e) => setF({ ...f, validityDays: Number(e.target.value) })} />
        <Select tone="light" label="Cobro" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} options={[{ value: "none", label: "Sin cobro (promoción / compensación)" }, ...["cash", "transfer", "mercadopago", "card"].map((m) => ({ value: m, label: METHOD_LABELS[m] }))]} />
      </div>
    </Modal>
  );
}
