import { useState } from "react";
import { Badge, Button, Card, DataTable, Input, Modal, Select, Stat } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { useAdminStore } from "@/features/admin/adminStore";
import { LocationPicker } from "@/features/admin/components/LocationPicker/LocationPicker";
import { Money } from "@/features/admin/components/Money/Money";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import { dateTime, money, time } from "@/utils/format";
import { METHOD_LABELS } from "@/utils/labels";
import styles from "./admin.module.css";

const METHODS = ["cash", "transfer", "mercadopago", "card"] as const;
type ByMethod = Record<(typeof METHODS)[number], number>;
const BILLS = [20000, 10000, 2000, 1000, 500, 200, 100];

interface CashMovement { _id: string; direction: "in" | "out"; method: string; amount: number; fee: number; category: string; concept: string; date: string; createdByName?: string }
interface Current {
  session: { _id: string; openedAt: string; openedBy: string; openingAmount: number } | null;
  movements?: CashMovement[];
  inByMethod?: ByMethod;
  outByMethod?: ByMethod;
  byCategory?: Record<string, number>;
  expected?: ByMethod | null;
  fees?: number;
  blind?: boolean;
}
interface Session { _id: string; location?: { name: string }; openedAt: string; closedAt?: string; status: string; openingAmount: number; expected?: ByMethod; counted?: ByMethod; difference?: ByMethod; closedBy?: string }

export default function CashPage() {
  const location = useAdminStore((s) => s.location);
  const { data, isLoading } = useAdminQuery<Current>("cash/current", { location }, { enabled: !!location, refetchInterval: 30_000 });
  const { data: categories } = useAdminQuery<Record<string, string>>("cash/categories");
  const { data: sessions } = useAdminQuery<{ items: Session[] }>("cash/sessions", { location });
  const [opening, setOpening] = useState(50000);
  const [moveOpen, setMoveOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const open = useAdminAction(() => adminApi.post("cash/open", { location, openingAmount: opening }), { success: "Caja abierta" });
  const s = data?.session;
  const total = (m?: ByMethod | null) => (m ? METHODS.reduce((a, k) => a + (m[k] ?? 0), 0) : 0);

  return (
    <>
      <PageHeader title="Caja" subtitle={s ? `Abierta por ${s.openedBy} a las ${time(s.openedAt)} con ${money(s.openingAmount)}` : "Caja diaria por sede y medio de pago"} actions={
        <>
          <LocationPicker />
          {s && <Button variant="light" onClick={() => setMoveOpen(true)}>Ingreso / retiro</Button>}
          {s && <Button onClick={() => setCloseOpen(true)}>Cerrar caja</Button>}
        </>
      } />
      {!isLoading && !s && (
        <Card tone="light" title="La caja está cerrada">
          <div className={styles.row}>
            <Input tone="light" label="Efectivo inicial" type="number" value={opening} onChange={(e) => setOpening(Number(e.target.value))} />
            <Button loading={open.isPending} onClick={() => open.mutate(undefined)} style={{ marginTop: "1.4rem" }}>Abrir caja</Button>
          </div>
        </Card>
      )}
      {s && (
        <>
          <div className={styles.stats}>
            {METHODS.map((m) => (
              <Stat key={m} label={METHOD_LABELS[m]} value={data?.expected ? money(data.expected[m]) : "Cierre ciego"} hint={`Entró ${money(data?.inByMethod?.[m])} · salió ${money(data?.outByMethod?.[m])}`} />
            ))}
            <Stat label="Comisiones de medios de pago" value={money(data?.fees)} tone="warning" hint="Mercado Pago, tarjeta" />
            {data?.expected && <Stat label="Caja esperada total" value={money(total(data.expected))} tone="positive" />}
          </div>
          <div className={styles.twoCols}>
            <Card tone="light" title="Entradas y salidas por concepto">
              <ul className={styles.lines}>
                {Object.entries(data?.byCategory ?? {}).map(([k, v]) => <li key={k}><span>{categories?.[k] ?? k}</span><Money value={v} signed /></li>)}
              </ul>
            </Card>
            <Card tone="light" title="Movimientos de la caja" padded={false}>
              <DataTable rows={data?.movements} rowKey={(m) => m._id} empty="Todavía no hay movimientos" columns={[
                { key: "t", header: "Hora", render: (m) => time(m.date) },
                { key: "c", header: "Concepto", render: (m) => <>{m.concept}<div className={styles.small}>{categories?.[m.category]}</div></> },
                { key: "m", header: "Medio", render: (m) => METHOD_LABELS[m.method], hideOnMobile: true },
                { key: "a", header: "Monto", align: "right", render: (m) => <Money value={m.direction === "in" ? m.amount : -m.amount} signed /> },
              ]} />
            </Card>
          </div>
        </>
      )}
      <Card tone="light" title="Cierres anteriores" padded={false}>
        <DataTable rows={sessions?.items.filter((x) => x.status === "closed")} rowKey={(x) => x._id} empty="Sin cierres" columns={[
          { key: "o", header: "Apertura", render: (x) => dateTime(x.openedAt) },
          { key: "c", header: "Cierre", render: (x) => `${dateTime(x.closedAt)} · ${x.closedBy ?? ""}` },
          { key: "e", header: "Esperado", align: "right", render: (x) => money(total(x.expected)) },
          { key: "r", header: "Contado", align: "right", render: (x) => money(total(x.counted)) },
          { key: "d", header: "Diferencia", align: "right", render: (x) => { const d = total(x.difference); return d === 0 ? <Badge tone="success">OK</Badge> : <Money value={d} signed strong />; } },
        ]} />
      </Card>
      {moveOpen && <MovementModal location={location} onClose={() => setMoveOpen(false)} />}
      {closeOpen && s && <CloseModal sessionId={s._id} expected={data?.expected ?? null} onClose={() => setCloseOpen(false)} />}
    </>
  );
}

function MovementModal({ location, onClose }: { location: string; onClose: () => void }) {
  const [f, setF] = useState({ direction: "out", method: "cash", amount: 0, category: "withdrawal", concept: "" });
  const save = useAdminAction(() => adminApi.post("cash/movements", { ...f, location }), { success: "Movimiento registrado", onSuccess: onClose });
  return (
    <Modal open onClose={onClose} title="Ingreso o retiro de caja" size="sm" footer={<Button disabled={!(f.amount > 0) || f.concept.length < 2} loading={save.isPending} onClick={() => save.mutate(undefined)}>Registrar</Button>}>
      <div className={styles.stack}>
        <Select tone="light" label="Tipo" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, direction: e.target.value === "deposit_in" ? "in" : "out" })} options={[
          { value: "withdrawal", label: "Retiro de efectivo" },
          { value: "deposit_in", label: "Ingreso de efectivo (cambio)" },
          { value: "other", label: "Otro" },
        ]} />
        <Select tone="light" label="Medio" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} options={METHODS.map((m) => ({ value: m, label: METHOD_LABELS[m] }))} />
        <Input tone="light" label="Monto" type="number" value={f.amount || ""} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} />
        <Input tone="light" label="Concepto" value={f.concept} onChange={(e) => setF({ ...f, concept: e.target.value })} placeholder="Ej: retiro del dueño, cambio para la caja" />
        <p className={styles.small}>Gastos, adelantos y pagos a proveedores se registran desde su sección y descuentan la caja solos.</p>
      </div>
    </Modal>
  );
}

/** Cierre ciego: el cajero cuenta sin ver lo esperado; la diferencia se ve después. */
function CloseModal({ sessionId, expected, onClose }: { sessionId: string; expected: ByMethod | null; onClose: () => void }) {
  const [bills, setBills] = useState<Record<number, number>>({});
  const [counted, setCounted] = useState<Partial<ByMethod>>({});
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<Session>();
  const cashFromBills = BILLS.reduce((a, b) => a + b * (bills[b] ?? 0), 0);
  const close = useAdminAction(
    () => adminApi.post<Session>(`cash/${sessionId}/close`, { counted: { ...counted, cash: cashFromBills || counted.cash || 0 }, denominations: Object.fromEntries(Object.entries(bills).filter(([, v]) => v)), notes }),
    { success: "Caja cerrada", onSuccess: setResult },
  );
  if (result) {
    return (
      <Modal open onClose={onClose} title="Resultado del cierre" footer={<Button onClick={onClose}>Listo</Button>}>
        <DataTable rows={[...METHODS]} rowKey={(m) => m} columns={[
          { key: "m", header: "Medio", render: (m) => METHOD_LABELS[m] },
          { key: "e", header: "Esperado", align: "right", render: (m) => money(result.expected?.[m]) },
          { key: "c", header: "Contado", align: "right", render: (m) => money(result.counted?.[m]) },
          { key: "d", header: "Diferencia", align: "right", render: (m) => <Money value={result.difference?.[m] ?? 0} signed strong /> },
        ]} />
      </Modal>
    );
  }
  return (
    <Modal open onClose={onClose} title="Cerrar caja" size="lg" footer={<Button loading={close.isPending} onClick={() => close.mutate(undefined)}>Cerrar caja</Button>}>
      <div className={styles.twoCols}>
        <div>
          <h4>Arqueo de efectivo</h4>
          {BILLS.map((b) => (
            <div key={b} className={styles.row} style={{ marginBottom: ".35rem" }}>
              <span style={{ width: 80 }}>{money(b)}</span>
              <input type="number" min={0} className={styles.input} style={{ width: 90 }} value={bills[b] ?? ""} onChange={(e) => setBills({ ...bills, [b]: Number(e.target.value) })} aria-label={`Billetes de ${b}`} />
              <span className={styles.small}>{money(b * (bills[b] ?? 0))}</span>
            </div>
          ))}
          <p className={styles.total}><span>Efectivo contado</span><span>{money(cashFromBills)}</span></p>
        </div>
        <div className={styles.stack}>
          <h4>Otros medios (según extractos)</h4>
          {METHODS.filter((m) => m !== "cash").map((m) => (
            <Input key={m} tone="light" type="number" label={METHOD_LABELS[m]} value={counted[m] ?? ""} onChange={(e) => setCounted({ ...counted, [m]: Number(e.target.value) })} hint={expected ? `Esperado ${money(expected[m])}` : undefined} />
          ))}
          <Input tone="light" label="Observaciones" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {!expected && <p className={styles.small}>Cierre ciego activado: vas a ver la diferencia después de cerrar.</p>}
        </div>
      </div>
    </Modal>
  );
}
