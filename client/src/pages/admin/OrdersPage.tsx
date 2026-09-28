import { useSearchParams } from "react-router-dom";
import { IoLogoWhatsapp } from "react-icons/io5";
import { Badge, Button, Card, DataTable } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import { dateTime, money } from "@/utils/format";
import styles from "./admin.module.css";

interface Order { _id: string; code: string; createdAt: string; client: { name: string; phone: string }; location: { name: string }; items: { name: string; qty: number }[]; total: number; status: string; issued?: { giftCards: string[]; packs: string[] }; payment?: { receiptPath?: string } }
const STATUS: Record<string, { label: string; tone: "warning" | "gold" | "success" | "neutral" }> = {
  pending_payment: { label: "Esperando pago", tone: "warning" }, payment_review: { label: "Revisar comprobante", tone: "gold" }, paid: { label: "Pagado", tone: "success" }, delivered: { label: "Entregado", tone: "success" }, cancelled: { label: "Cancelado", tone: "neutral" },
};

export default function OrdersPage() {
  const [params] = useSearchParams();
  const code = params.get("code") ?? undefined;
  const { data, isLoading } = useAdminQuery<{ items: Order[] }>("orders", { code });
  const approve = useAdminAction((id: string) => adminApi.post<Order>(`orders/${id}/approve`, { method: "transfer" }), {
    success: (o) => `Pedido aprobado${o.issued?.giftCards.length ? ` · gift cards: ${o.issued.giftCards.join(", ")}` : ""}${o.issued?.packs.length ? ` · bonos: ${o.issued.packs.join(", ")}` : ""}`,
  });
  const cancel = useAdminAction((id: string) => adminApi.post(`orders/${id}/cancel`), { success: "Pedido cancelado" });
  const openWa = async (id: string) => {
    const r = await adminApi.get<{ url: string; receiptUrl: string | null }>(`orders/${id}/whatsapp`);
    window.open(r.receiptUrl ?? r.url, "_blank");
  };
  return (
    <>
      <PageHeader title="Pedidos de la tienda" subtitle="Al aprobar el pago: entra a caja, baja el stock y se emiten las gift cards / bonos." />
      <Card tone="light" padded={false}>
        <DataTable loading={isLoading} rows={data?.items} rowKey={(o) => o._id} columns={[
          { key: "c", header: "Pedido", render: (o) => <><strong>{o.code}</strong><div className={styles.small}>{dateTime(o.createdAt)}</div></> },
          { key: "cl", header: "Cliente", render: (o) => o.client?.name },
          { key: "i", header: "Detalle", render: (o) => o.items.map((i) => `${i.qty} ${i.name}`).join(", "), hideOnMobile: true },
          { key: "t", header: "Total", align: "right", render: (o) => money(o.total) },
          { key: "s", header: "Estado", render: (o) => <Badge tone={STATUS[o.status]?.tone}>{STATUS[o.status]?.label}</Badge> },
          { key: "a", header: "", align: "right", render: (o) => ["pending_payment", "payment_review"].includes(o.status) && (
            <div className={styles.row} style={{ justifyContent: "flex-end" }}>
              {o.payment?.receiptPath && <Button size="sm" variant="ghost" icon={<IoLogoWhatsapp />} onClick={() => openWa(o._id)}>Comprobante</Button>}
              <Button size="sm" onClick={() => approve.mutate(o._id)}>Aprobar pago</Button>
              <Button size="sm" variant="ghost" onClick={() => cancel.mutate(o._id)}>Cancelar</Button>
            </div>
          ) },
        ]} />
      </Card>
    </>
  );
}
