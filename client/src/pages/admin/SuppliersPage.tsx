import { useState } from "react";
import { Button, DataTable, Input, Modal, Select } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { useAdminStore } from "@/features/admin/adminStore";
import { Money } from "@/features/admin/components/Money/Money";
import { ResourcePage } from "@/features/admin/components/ResourcePage/ResourcePage";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { Movement } from "@/types";
import { date, money } from "@/utils/format";
import { METHOD_LABELS } from "@/utils/labels";
import styles from "./admin.module.css";

interface Supplier { _id: string; name: string; contactName?: string; phone?: string; cuit?: string; supplies?: string; paymentTerms?: string }

export default function SuppliersPage() {
  const [account, setAccount] = useState<Supplier | null>(null);
  return (
    <>
      <ResourcePage<Supplier>
        title="Proveedores"
        resource="suppliers"
        singular="proveedor"
        onRowClick={setAccount}
        columns={[
          { key: "n", header: "Proveedor", render: (s) => <strong>{s.name}</strong> },
          { key: "c", header: "Contacto", render: (s) => [s.contactName, s.phone].filter(Boolean).join(" · "), hideOnMobile: true },
          { key: "p", header: "Provee", render: (s) => s.supplies, hideOnMobile: true },
          { key: "t", header: "Condición", render: (s) => s.paymentTerms, hideOnMobile: true },
        ]}
        rowActions={(s) => <Button size="sm" variant="light" onClick={() => setAccount(s)}>Cuenta</Button>}
        fields={[
          { name: "name", label: "Razón social / nombre", required: true },
          { name: "cuit", label: "CUIT" },
          { name: "contactName", label: "Contacto" },
          { name: "phone", label: "Teléfono", type: "tel" },
          { name: "email", label: "Email", type: "email" },
          { name: "address", label: "Dirección" },
          { name: "supplies", label: "Qué provee", span: 2 },
          { name: "paymentTerms", label: "Condición de pago", placeholder: "Contado, 30 días…" },
          { name: "notes", label: "Notas", type: "textarea", span: 2 },
        ]}
      />
      {account && <SupplierAccount supplier={account} onClose={() => setAccount(null)} />}
    </>
  );
}

function SupplierAccount({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const location = useAdminStore((s) => s.location);
  const { data } = useAdminQuery<{ balance: number; movements: Movement[]; purchased: number; lastPurchase?: string }>(`suppliers/${supplier._id}/account`);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("transfer");
  const pay = useAdminAction(() => adminApi.post(`suppliers/${supplier._id}/payments`, { amount, method, location }), { success: "Pago registrado", onSuccess: () => setAmount(0) });
  const paid = (data?.purchased ?? 0) - (data?.balance ?? 0);
  return (
    <Modal open onClose={onClose} title={`Cuenta · ${supplier.name}`} size="lg">
      <div className={styles.stack}>
        <dl className={styles.kv}>
          <dt>Compras</dt><dd>{money(data?.purchased)}</dd>
          <dt>Pagado</dt><dd>{money(paid)}</dd>
          <dt>Última compra</dt><dd>{date(data?.lastPurchase)}</dd>
        </dl>
        <p className={styles.total}><span>Pendiente de pago</span><Money value={-(data?.balance ?? 0)} strong /></p>
        <div className={styles.row}>
          <Input tone="light" label="Pagar" type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
          <Select tone="light" label="Medio" value={method} onChange={(e) => setMethod(e.target.value)} options={["transfer", "cash", "mercadopago"].map((m) => ({ value: m, label: METHOD_LABELS[m] }))} />
          <Button style={{ marginTop: "1.4rem" }} disabled={!(amount > 0) || !location} loading={pay.isPending} onClick={() => pay.mutate(undefined)}>Registrar pago</Button>
        </div>
        <DataTable rows={data?.movements} rowKey={(m) => m._id} columns={[
          { key: "d", header: "Fecha", render: (m) => date(m.date) },
          { key: "c", header: "Concepto", render: (m) => m.concept },
          { key: "a", header: "Monto", align: "right", render: (m) => money(Math.abs(m.amount)) + (m.amount > 0 ? " (compra)" : " (pago)") },
          { key: "s", header: "Saldo", align: "right", render: (m) => money(m.balanceAfter) },
        ]} />
      </div>
    </Modal>
  );
}
