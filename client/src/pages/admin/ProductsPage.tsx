import { useState } from "react";
import { IoAlertCircleOutline } from "react-icons/io5";
import { Badge, Button, Card, DataTable, Input, Modal, Select, Tabs } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { ResourcePage } from "@/features/admin/components/ResourcePage/ResourcePage";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { Paged, Product } from "@/types";
import { dateTime, money } from "@/utils/format";
import styles from "./admin.module.css";

const KINDS = { sale: "Venta", operational: "Uso interno", giftcard: "Gift card" } as const;
const MOVE_LABELS: Record<string, string> = { purchase: "Compra", sale: "Venta", consumption: "Consumo / retiro", adjustment: "Ajuste", return: "Devolución", loss: "Pérdida" };

export default function ProductsPage() {
  const [tab, setTab] = useState("catalogo");
  const [kind, setKind] = useState("");
  const { data: low } = useAdminQuery<{ items: Product[] }>("stock/low");
  return (
    <>
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: "catalogo", label: "Productos" },
        { value: "consumo", label: "Retiros de barberos" },
        { value: "movimientos", label: "Movimientos de stock" },
      ]} />
      {tab === "catalogo" && (
        <ResourcePage<Product>
          title="Productos y stock"
          subtitle={low?.items.length ? <span className={styles.dangerText}><IoAlertCircleOutline /> {low.items.length} productos con stock bajo: {low.items.map((p) => p.name).join(", ")}</span> : "Stock de venta, stock operativo (insumos) y gift cards."}
          resource="products"
          singular="producto"
          params={{ kind: kind || undefined }}
          filters={<Select tone="light" value={kind} onChange={(e) => setKind(e.target.value)} placeholder="Todos los tipos" options={Object.entries(KINDS).map(([value, label]) => ({ value, label }))} />}
          defaults={{ kind: "sale", active: true, minStock: 2 }}
          headerActions={<AdjustButton />}
          columns={[
            { key: "n", header: "Producto", render: (p) => <><strong>{p.name}</strong><div className={styles.small}>{p.sku ?? ""} {p.category}</div></> },
            { key: "k", header: "Tipo", render: (p) => <Badge tone={p.kind === "sale" ? "info" : p.kind === "giftcard" ? "gold" : "neutral"}>{KINDS[p.kind]}</Badge>, hideOnMobile: true },
            { key: "c", header: "Costo", align: "right", render: (p) => money(p.cost), hideOnMobile: true },
            { key: "p", header: "Precio", align: "right", render: (p) => (p.kind === "operational" ? "—" : money(p.price)) },
            { key: "s", header: "Stock", align: "right", render: (p) => (p.kind === "giftcard" ? "∞" : <span className={p.stock <= (p.minStock ?? 0) ? styles.dangerText : undefined}>{p.stock} {p.unit !== "unidad" ? p.unit : ""}</span>) },
            { key: "m", header: "Mín.", align: "right", render: (p) => p.minStock ?? 0, hideOnMobile: true },
            { key: "sup", header: "Proveedor", render: (p) => (typeof p.supplier === "object" ? p.supplier?.name : "—"), hideOnMobile: true },
          ]}
          fields={[
            { name: "name", label: "Nombre", required: true },
            { name: "kind", label: "Tipo", type: "select", required: true, options: Object.entries(KINDS).map(([value, label]) => ({ value, label })) },
            { name: "sku", label: "SKU" },
            { name: "category", label: "Categoría" },
            { name: "cost", label: "Costo", type: "money" },
            { name: "price", label: "Precio de venta", type: "money" },
            { name: "minStock", label: "Stock mínimo (alerta)", type: "number" },
            { name: "unit", label: "Unidad", placeholder: "unidad, caja, bidón…" },
            { name: "giftValue", label: "Valor que acredita (gift cards)", type: "money" },
            { name: "slug", label: "URL en la tienda", placeholder: "pomada-mate" },
            { name: "description", label: "Descripción", type: "textarea", span: 2 },
            { name: "images", label: "Imágenes (URLs)", type: "list" },
            { name: "shop", label: "Visible en la tienda online", type: "checkbox" },
            { name: "featured", label: "Destacado", type: "checkbox" },
            { name: "active", label: "Activo", type: "checkbox" },
          ]}
        />
      )}
      {tab === "consumo" && <ConsumptionPanel />}
      {tab === "movimientos" && <StockMovements />}
    </>
  );
}

function AdjustButton() {
  const [open, setOpen] = useState(false);
  const { data } = useAdminQuery<Paged<Product>>("products", { limit: 300 }, { enabled: open });
  const [f, setF] = useState({ product: "", qty: 0, type: "adjustment", reason: "" });
  const save = useAdminAction(() => adminApi.post("stock/adjust", f), { success: "Stock ajustado", onSuccess: () => setOpen(false) });
  return (
    <>
      <Button variant="light" onClick={() => setOpen(true)}>Ajustar stock</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Ajuste de inventario" size="sm" footer={<Button disabled={!f.product || !f.qty || f.reason.length < 2} loading={save.isPending} onClick={() => save.mutate(undefined)}>Guardar</Button>}>
        <div className={styles.stack}>
          <Select tone="light" label="Producto" placeholder="Elegí" value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })} options={(data?.items ?? []).filter((p) => p.kind !== "giftcard").map((p) => ({ value: p._id, label: `${p.name} (stock ${p.stock})` }))} />
          <Select tone="light" label="Tipo" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} options={[{ value: "adjustment", label: "Ajuste por conteo" }, { value: "loss", label: "Pérdida / rotura" }, { value: "return", label: "Devolución" }]} />
          <Input tone="light" label="Cantidad (+ suma / − resta)" type="number" value={f.qty || ""} onChange={(e) => setF({ ...f, qty: Number(e.target.value) })} />
          <Input tone="light" label="Motivo" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
        </div>
      </Modal>
    </>
  );
}

/** "Lucas retiró 1 pomada y 2 cuchillas": queda registrado y opcionalmente se le descuenta. */
function ConsumptionPanel() {
  const { data: barbers } = useAdminQuery<Paged<{ _id: string; name: string }>>("barbers", { limit: 100 });
  const { data: products } = useAdminQuery<Paged<Product>>("products", { limit: 300, active: true });
  const [barber, setBarber] = useState("");
  const [items, setItems] = useState([{ product: "", qty: 1 }]);
  const [charge, setCharge] = useState("none");
  const [reason, setReason] = useState("");
  const save = useAdminAction(() => adminApi.post<{ lines: string[]; charge: number }>("stock/consumption", { barber, items: items.filter((i) => i.product), chargeToBarber: charge, reason: reason || undefined }), {
    success: (r) => `Registrado: ${r.lines.join(", ")}${r.charge ? ` · descontado ${money(r.charge)}` : ""}`,
    onSuccess: () => setItems([{ product: "", qty: 1 }]),
  });
  return (
    <Card tone="light" title="Registrar retiro de productos">
      <div className={styles.stack}>
        <div className={styles.formGrid}>
          <Select tone="light" label="Barbero" placeholder="Elegí" value={barber} onChange={(e) => setBarber(e.target.value)} options={(barbers?.items ?? []).map((b) => ({ value: b._id, label: b.name }))} />
          <Select tone="light" label="¿Se le descuenta?" value={charge} onChange={(e) => setCharge(e.target.value)} options={[{ value: "none", label: "No (uso en el puesto)" }, { value: "cost", label: "Sí, a precio de costo" }, { value: "price", label: "Sí, a precio de venta" }]} />
        </div>
        {items.map((it, i) => (
          <div key={i} className={styles.formGrid}>
            <Select tone="light" label="Producto" placeholder="Elegí" value={it.product} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, product: e.target.value } : x)))} options={(products?.items ?? []).filter((p) => p.kind !== "giftcard").map((p) => ({ value: p._id, label: `${p.name} (stock ${p.stock})` }))} />
            <Input tone="light" label="Cantidad" type="number" value={it.qty} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} />
          </div>
        ))}
        <Button size="sm" variant="light" onClick={() => setItems([...items, { product: "", qty: 1 }])}>+ Otro producto</Button>
        <Input tone="light" label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button disabled={!barber || !items.some((i) => i.product)} loading={save.isPending} onClick={() => save.mutate(undefined)}>Registrar retiro</Button>
      </div>
    </Card>
  );
}

function StockMovements() {
  const { data, isLoading } = useAdminQuery<{ items: { _id: string; createdAt: string; product: { name: string }; type: string; qty: number; stockAfter: number; reason?: string; barber?: { name: string }; createdByName?: string }[] }>("stock/movements");
  return (
    <Card tone="light" padded={false}>
      <DataTable loading={isLoading} rows={data?.items} rowKey={(m) => m._id} columns={[
        { key: "d", header: "Fecha", render: (m) => dateTime(m.createdAt) },
        { key: "p", header: "Producto", render: (m) => m.product?.name },
        { key: "t", header: "Tipo", render: (m) => MOVE_LABELS[m.type] ?? m.type },
        { key: "q", header: "Cantidad", align: "right", render: (m) => <span className={m.qty < 0 ? styles.dangerText : styles.okText}>{m.qty > 0 ? `+${m.qty}` : m.qty}</span> },
        { key: "s", header: "Stock", align: "right", render: (m) => m.stockAfter },
        { key: "r", header: "Detalle", render: (m) => [m.barber?.name, m.reason].filter(Boolean).join(" · "), hideOnMobile: true },
        { key: "u", header: "Usuario", render: (m) => m.createdByName, hideOnMobile: true },
      ]} />
    </Card>
  );
}
