import { useState } from "react";
import { IoAdd } from "react-icons/io5";
import { Button, Card, DataTable, Input, Modal, Select } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { useAdminStore } from "@/features/admin/adminStore";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { Paged, Product } from "@/types";
import { date, isoDay, money } from "@/utils/format";
import { METHOD_LABELS } from "@/utils/labels";
import styles from "./admin.module.css";

interface Purchase { _id: string; number: number; supplier: { name: string }; date: string; items: { name: string; qty: number; unitCost: number }[]; total: number; paidAmount: number; invoiceNumber?: string }

export default function PurchasesPage() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useAdminQuery<{ items: Purchase[] }>("purchases");
  return (
    <>
      <PageHeader title="Compras" subtitle="Cada compra suma stock, actualiza el costo y registra la deuda con el proveedor." actions={<Button icon={<IoAdd />} onClick={() => setOpen(true)}>Nueva compra</Button>} />
      <Card tone="light" padded={false}>
        <DataTable loading={isLoading} rows={data?.items} rowKey={(p) => p._id} columns={[
          { key: "n", header: "N°", render: (p) => `#${String(p.number).padStart(5, "0")}` },
          { key: "d", header: "Fecha", render: (p) => date(p.date) },
          { key: "s", header: "Proveedor", render: (p) => p.supplier?.name },
          { key: "i", header: "Detalle", render: (p) => p.items.map((i) => `${i.qty} ${i.name}`).join(", "), hideOnMobile: true },
          { key: "t", header: "Total", align: "right", render: (p) => money(p.total) },
          { key: "p", header: "Pagado", align: "right", render: (p) => money(p.paidAmount) },
          { key: "r", header: "Pendiente", align: "right", render: (p) => <span className={p.total - p.paidAmount > 0 ? styles.dangerText : undefined}>{money(p.total - p.paidAmount)}</span> },
        ]} />
      </Card>
      {open && <PurchaseModal onClose={() => setOpen(false)} />}
    </>
  );
}

function PurchaseModal({ onClose }: { onClose: () => void }) {
  const location = useAdminStore((s) => s.location);
  const { data: suppliers } = useAdminQuery<Paged<{ _id: string; name: string }>>("suppliers", { limit: 200 });
  const { data: products } = useAdminQuery<Paged<Product>>("products", { limit: 300 });
  const [supplier, setSupplier] = useState("");
  const [items, setItems] = useState([{ product: "", qty: 1, unitCost: 0 }]);
  const [paid, setPaid] = useState(0);
  const [method, setMethod] = useState("transfer");
  const [invoice, setInvoice] = useState("");
  const [day, setDay] = useState(isoDay());
  const total = items.reduce((a, i) => a + i.qty * i.unitCost, 0);
  const save = useAdminAction(
    () => adminApi.post("purchases", { supplier, items: items.filter((i) => i.product), paidAmount: paid, method, invoiceNumber: invoice || undefined, location, date: `${day}T12:00:00-03:00` }),
    { success: "Compra registrada: stock y cuenta del proveedor actualizados", onSuccess: onClose },
  );
  return (
    <Modal open onClose={onClose} title="Nueva compra" size="lg" footer={<Button disabled={!supplier || !location || !items.some((i) => i.product)} loading={save.isPending} onClick={() => save.mutate(undefined)}>Registrar compra</Button>}>
      <div className={styles.stack}>
        <div className={styles.formGrid}>
          <Select tone="light" label="Proveedor" placeholder="Elegí" value={supplier} onChange={(e) => setSupplier(e.target.value)} options={(suppliers?.items ?? []).map((s) => ({ value: s._id, label: s.name }))} />
          <Input tone="light" label="Fecha" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          <Input tone="light" label="N° de factura" value={invoice} onChange={(e) => setInvoice(e.target.value)} />
        </div>
        {items.map((it, i) => (
          <div key={i} className={styles.row}>
            <Select tone="light" label="Producto" placeholder="Elegí" value={it.product} onChange={(e) => { const p = products?.items.find((x) => x._id === e.target.value); setItems(items.map((x, j) => (j === i ? { ...x, product: e.target.value, unitCost: p?.cost ?? 0 } : x))); }} options={(products?.items ?? []).filter((p) => p.kind !== "giftcard").map((p) => ({ value: p._id, label: p.name }))} />
            <Input tone="light" label="Cant." type="number" value={it.qty} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} />
            <Input tone="light" label="Costo unit." type="number" value={it.unitCost} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, unitCost: Number(e.target.value) } : x)))} />
          </div>
        ))}
        <Button size="sm" variant="light" onClick={() => setItems([...items, { product: "", qty: 1, unitCost: 0 }])}>+ Producto</Button>
        <p className={styles.total}><span>Total</span><span>{money(total)}</span></p>
        <div className={styles.formGrid}>
          <Input tone="light" label="Pagado ahora" type="number" value={paid} onChange={(e) => setPaid(Number(e.target.value))} hint="El resto queda como deuda con el proveedor" />
          <Select tone="light" label="Medio" value={method} onChange={(e) => setMethod(e.target.value)} options={["transfer", "cash", "mercadopago", "card"].map((m) => ({ value: m, label: METHOD_LABELS[m] }))} />
        </div>
      </div>
    </Modal>
  );
}
