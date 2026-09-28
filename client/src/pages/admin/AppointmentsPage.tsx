import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { IoAdd, IoLogoWhatsapp, IoTrashOutline } from "react-icons/io5";
import { Badge, Button, Card, DataTable, Input, Modal, Select, Textarea, toast } from "@/components/ui";
import { can, useAuthStore } from "@/features/auth/authStore";
import { adminApi } from "@/features/admin/admin.api";
import { useAdminStore } from "@/features/admin/adminStore";
import { LocationPicker } from "@/features/admin/components/LocationPicker/LocationPicker";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import { bookingApi } from "@/features/booking/booking.api";
import { useServices } from "@/features/catalog/useCatalog";
import { errorCode, errorMessage } from "@/services/http";
import type { Appointment, Paged, Product } from "@/types";
import { addDaysIso, dateTime, isoDay, longDate, money, time } from "@/utils/format";
import { CANCEL_BY_LABELS, METHOD_LABELS, STATUS_LABELS, STATUS_TONE } from "@/utils/labels";
import styles from "./admin.module.css";

const TENDERS = ["cash", "transfer", "mercadopago", "card", "balance", "giftcard", "pack", "membership"];
const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "payment_review", label: "Revisar comprobante" },
  { value: "pending_payment", label: "Esperando seña" },
  { value: "confirmed,in_progress", label: "Confirmados" },
  { value: "completed", label: "Realizados" },
  { value: "cancelled,no_show", label: "Cancelados / no-show" },
];

export default function AppointmentsPage() {
  const [params, setParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const manage = can(user, "appointments.manage");
  const location = useAdminStore((s) => s.location);
  const [day, setDay] = useState(isoDay());
  const status = params.get("status") ?? "";
  const code = params.get("code") ?? "";
  const [barber, setBarber] = useState("");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [creating, setCreating] = useState(false);

  const query = code ? { code } : { location: location || undefined, date: status === "payment_review" || status === "pending_payment" ? undefined : day, status: status || undefined, barber: barber || undefined, sort: "asc" };
  const { data, isLoading } = useAdminQuery<{ items: Appointment[] }>("appointments", query, { refetchInterval: 30_000 });
  const { data: barbers } = useAdminQuery<Paged<{ _id: string; name: string }>>("barbers", { location: location || undefined, limit: 100 }, { enabled: manage });

  useEffect(() => {
    if (code && data?.items.length === 1) setSelected(data.items[0]);
  }, [code, data]);

  const totals = useMemo(() => {
    const items = data?.items ?? [];
    return { count: items.length, done: items.filter((a) => a.status === "completed").length, revenue: items.filter((a) => a.status === "completed").reduce((s, a) => s + a.total, 0) };
  }, [data]);

  return (
    <>
      <PageHeader
        title="Turnos"
        subtitle={code ? `Buscando ${code}` : `${longDate(`${day}T12:00:00-03:00`)} · ${totals.count} turnos · ${totals.done} realizados · ${money(totals.revenue)}`}
        actions={manage && <Button icon={<IoAdd />} onClick={() => setCreating(true)}>Nuevo turno</Button>}
      />
      <div className={styles.row} style={{ marginBottom: "1rem" }}>
        {manage && <LocationPicker allowAll />}
        <Button variant="light" size="sm" onClick={() => setDay(addDaysIso(day, -1))}>←</Button>
        <input type="date" className={styles.input} value={day} onChange={(e) => setDay(e.target.value)} aria-label="Día" />
        <Button variant="light" size="sm" onClick={() => setDay(addDaysIso(day, 1))}>→</Button>
        <Button variant="light" size="sm" onClick={() => setDay(isoDay())}>Hoy</Button>
        {manage && (
          <select className={styles.input} value={barber} onChange={(e) => setBarber(e.target.value)} aria-label="Barbero">
            <option value="">Todos los barberos</option>
            {barbers?.items.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        )}
        <div className={styles.chips}>
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} className={`${styles.chip} ${status === f.value ? styles.chipActive : ""}`} onClick={() => setParams(f.value ? { status: f.value } : {})}>{f.label}</button>
          ))}
        </div>
      </div>
      <DataTable
        loading={isLoading}
        rows={data?.items}
        rowKey={(a) => a._id}
        onRowClick={setSelected}
        empty="No hay turnos con estos filtros"
        columns={[
          { key: "time", header: "Hora", render: (a) => <strong>{status ? dateTime(a.startsAt) : time(a.startsAt)}</strong> },
          { key: "client", header: "Cliente", render: (a) => <>{a.client?.name}<div className={styles.small}>{a.code}</div></> },
          { key: "service", header: "Servicio", render: (a) => a.service?.name, hideOnMobile: true },
          { key: "barber", header: "Barbero", render: (a) => a.barber?.name, hideOnMobile: true },
          { key: "loc", header: "Sede", render: (a) => a.location?.name, hideOnMobile: true },
          { key: "total", header: "Total", align: "right", render: (a) => money(a.total) },
          { key: "status", header: "Estado", render: (a) => <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABELS[a.status]}</Badge> },
        ]}
      />
      {selected && <AppointmentModal appointment={selected} onClose={() => { setSelected(null); if (code) setParams({}); }} manage={manage} />}
      {creating && <NewAppointmentModal onClose={() => setCreating(false)} defaultDate={day} />}
    </>
  );
}

function AppointmentModal({ appointment, onClose, manage }: { appointment: Appointment; onClose: () => void; manage: boolean }) {
  const a = appointment;
  const [mode, setMode] = useState<"view" | "complete" | "cancel" | "reschedule">("view");
  const { data: wa } = useAdminQuery<{ url: string; text: string; receiptUrl: string | null }>(`appointments/${a._id}/whatsapp`, undefined, { enabled: !!a.deposit?.receiptPath });
  const approve = useAdminAction(() => adminApi.post(`appointments/${a._id}/approve-deposit`, {}), { success: "Seña aprobada: turno confirmado", onSuccess: onClose });
  const reject = useAdminAction((reason: string) => adminApi.post(`appointments/${a._id}/reject-deposit`, { reason }), { success: "Comprobante rechazado", onSuccess: onClose });
  const start = useAdminAction(() => adminApi.post(`appointments/${a._id}/start`), { success: "Turno en curso", onSuccess: onClose });
  const active = ["pending_payment", "payment_review", "confirmed", "in_progress"].includes(a.status);

  return (
    <Modal open onClose={onClose} title={`${a.service?.name} · ${a.client?.name}`} size="lg">
      {mode === "view" && (
        <div className={styles.stack}>
          <div className={styles.row}>
            <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABELS[a.status]}</Badge>
            <span className={styles.muted}>{a.code} · {longDate(a.startsAt)} {time(a.startsAt)} h · {a.barber?.name} · {a.location?.name}</span>
          </div>
          <dl className={styles.kv}>
            <dt>Cliente</dt><dd>{a.client?.name} · +{a.client?.phone}</dd>
            <dt>Precio</dt><dd>{money(a.price)}</dd>
            {a.discount > 0 && <><dt>Descuento</dt><dd>−{money(a.discount)} {a.discountReason && `(${a.discountReason})`}</dd></>}
            <dt>Total</dt><dd>{money(a.total)}</dd>
            <dt>Seña</dt><dd>{a.deposit?.paid ? `${money(a.deposit.paid)} (${METHOD_LABELS[a.deposit.method ?? ""] ?? a.deposit.method})` : a.deposit?.required ? `${money(a.deposit.required)} pendiente` : "—"}</dd>
            <dt>Cobrado</dt><dd>{money(a.paidAmount)}</dd>
            {a.commission !== undefined && a.commission !== null && <><dt>Comisión barbero</dt><dd>{money(a.commission)}</dd></>}
            {a.notes && <><dt>Nota</dt><dd>{a.notes}</dd></>}
            {a.cancellation?.by && <><dt>Cancelación</dt><dd>{CANCEL_BY_LABELS[a.cancellation.by]} · {a.cancellation.reason} {a.cancellation.depositRetained && "· seña retenida"}</dd></>}
          </dl>
          {a.status === "payment_review" && (
            <Card tone="light" title="Comprobante de la seña">
              {wa?.receiptUrl ? (
                /\.pdf|application\/pdf/i.test(wa.receiptUrl) ? <a href={wa.receiptUrl} target="_blank" rel="noreferrer">Abrir PDF</a> : <a href={wa.receiptUrl} target="_blank" rel="noreferrer"><img src={wa.receiptUrl} alt="Comprobante" className={styles.receipt} /></a>
              ) : <p className={styles.muted}>Cargando…</p>}
              {manage && (
                <div className={styles.row} style={{ marginTop: "1rem" }}>
                  <Button loading={approve.isPending} onClick={() => approve.mutate(undefined)}>Aprobar seña</Button>
                  <Button variant="light" onClick={() => { const r = window.prompt("Motivo del rechazo"); if (r && r.length >= 3) reject.mutate(r); }}>Rechazar</Button>
                </div>
              )}
            </Card>
          )}
          {a.status === "pending_payment" && manage && (
            <Button variant="light" onClick={() => approve.mutate(undefined)}>Registrar seña recibida (sin comprobante)</Button>
          )}
          <div className={styles.row}>
            {active && <Button onClick={() => setMode("complete")}>Finalizar y cobrar</Button>}
            {a.status === "confirmed" && <Button variant="light" loading={start.isPending} onClick={() => start.mutate(undefined)}>Iniciar</Button>}
            {active && manage && <Button variant="light" onClick={() => setMode("reschedule")}>Reprogramar</Button>}
            {active && <Button variant="light" onClick={() => setMode("cancel")}>Cancelar / no-show</Button>}
            {wa && <Button variant="whatsapp" href={wa.url} icon={<IoLogoWhatsapp />}>WhatsApp</Button>}
          </div>
        </div>
      )}
      {mode === "complete" && <CompleteForm appointment={a} onDone={onClose} onBack={() => setMode("view")} />}
      {mode === "cancel" && <CancelForm appointment={a} onDone={onClose} onBack={() => setMode("view")} />}
      {mode === "reschedule" && <RescheduleForm appointment={a} onDone={onClose} onBack={() => setMode("view")} />}
    </Modal>
  );
}

interface CompleteValues {
  payments: { tender: string; amount: number; giftCardCode?: string }[];
  tipAmount?: number;
  tipMethod: string;
  products: { product: string; qty: number }[];
  cutNote?: string;
}

function CompleteForm({ appointment: a, onDone, onBack }: { appointment: Appointment; onDone: () => void; onBack: () => void }) {
  const pending = Math.max(0, a.total - (a.deposit?.paid ?? 0));
  const user = useAuthStore((s) => s.user);
  const { data: products } = useAdminQuery<Paged<Product>>("products", { kind: "sale", active: true, limit: 200 }, { enabled: can(user, "inventory.manage") });
  const form = useForm<CompleteValues>({ defaultValues: { payments: [{ tender: "cash", amount: pending }], tipMethod: "cash", products: [] } });
  const pays = useFieldArray({ control: form.control, name: "payments" });
  const prods = useFieldArray({ control: form.control, name: "products" });
  const [needsDebt, setNeedsDebt] = useState<string>();
  const values = form.watch();
  const productTotal = (values.products ?? []).reduce((s, p) => s + (products?.items.find((x) => x._id === p.product)?.price ?? 0) * (Number(p.qty) || 0), 0);
  const paid = (values.payments ?? []).reduce((s, p) => s + (["pack", "membership"].includes(p.tender) ? a.total : Number(p.amount) || 0), 0);
  const remaining = pending + productTotal - paid;

  const complete = useAdminAction(
    (allowDebt: boolean) =>
      adminApi.post<{ clientBalance: number; commission: number }>(`appointments/${a._id}/complete`, {
        payments: values.payments.map((p) => ({ tender: p.tender, amount: Number(p.amount) || 0, giftCardCode: p.giftCardCode || undefined })),
        tip: values.tipAmount ? { amount: Number(values.tipAmount), method: values.tipMethod } : undefined,
        products: values.products.filter((p) => p.product && p.qty).map((p) => ({ product: p.product, qty: Number(p.qty) })),
        cutNote: values.cutNote || undefined,
        allowDebt,
      }),
    {
      success: (r) => `Turno cerrado. Comisión ${money(r.commission)}. Saldo del cliente: ${money(r.clientBalance)}`,
      onSuccess: onDone,
      silentError: true,
    },
  );
  const submit = (allowDebt = false) =>
    complete.mutate(allowDebt, {
      onError: (err) => {
        if (errorCode(err) === "CREDIT_LIMIT") setNeedsDebt((err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message);
        else toast.error(errorMessage(err));
      },
    });

  return (
    <div className={styles.stack}>
      <dl className={styles.kv}>
        <dt>Total del servicio</dt><dd>{money(a.total)}</dd>
        <dt>Seña ya cobrada</dt><dd>−{money(a.deposit?.paid ?? 0)}</dd>
        {productTotal > 0 && <><dt>Productos</dt><dd>+{money(productTotal)}</dd></>}
      </dl>
      <p className={styles.total}><span>A cobrar</span><span>{money(pending + productTotal)}</span></p>

      <Card tone="light" title="Pagos" actions={<Button size="sm" variant="light" icon={<IoAdd />} onClick={() => pays.append({ tender: "transfer", amount: Math.max(0, remaining) })}>Otro medio</Button>}>
        {pays.fields.map((f, i) => (
          <div key={f.id} className={styles.formGrid} style={{ marginBottom: ".5rem" }}>
            <Select tone="light" label="Medio" options={TENDERS.map((t) => ({ value: t, label: METHOD_LABELS[t] }))} {...form.register(`payments.${i}.tender`)} />
            <div className={styles.row}>
              {!["pack", "membership"].includes(values.payments?.[i]?.tender) && <Input tone="light" label="Monto" type="number" {...form.register(`payments.${i}.amount`, { valueAsNumber: true })} />}
              {values.payments?.[i]?.tender === "giftcard" && <Input tone="light" label="Código" placeholder="GFT-…" {...form.register(`payments.${i}.giftCardCode`)} />}
              {pays.fields.length > 1 && <Button size="sm" variant="ghost" onClick={() => pays.remove(i)} aria-label="Quitar"><IoTrashOutline /></Button>}
            </div>
          </div>
        ))}
        <p className={remaining > 0 ? styles.dangerText : styles.okText}>
          {remaining > 0 ? `Faltan ${money(remaining)} → quedará como deuda del cliente` : remaining < 0 ? `Sobran ${money(-remaining)} → quedan como saldo a favor` : "Cobro completo"}
        </p>
        <p className={styles.small}>“Saldo a favor” usa crédito del cliente. “Pack” y “Membresía” descuentan una visita del cupo.</p>
      </Card>

      {products && (
        <Card tone="light" title="Productos vendidos" actions={<Button size="sm" variant="light" icon={<IoAdd />} onClick={() => prods.append({ product: "", qty: 1 })}>Agregar</Button>}>
          {prods.fields.map((f, i) => (
            <div key={f.id} className={styles.formGrid}>
              <Select tone="light" label="Producto" placeholder="Elegí" options={products.items.map((p) => ({ value: p._id, label: `${p.name} (${money(p.price)} · stock ${p.stock})` }))} {...form.register(`products.${i}.product`)} />
              <div className={styles.row}>
                <Input tone="light" label="Cant." type="number" {...form.register(`products.${i}.qty`, { valueAsNumber: true })} />
                <Button size="sm" variant="ghost" onClick={() => prods.remove(i)} aria-label="Quitar"><IoTrashOutline /></Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <div className={styles.formGrid}>
        <Input tone="light" label="Propina (opcional)" type="number" {...form.register("tipAmount", { valueAsNumber: true })} hint="Se acredita al barbero" />
        <Select tone="light" label="Propina en" options={["cash", "transfer", "mercadopago", "card"].map((t) => ({ value: t, label: METHOD_LABELS[t] }))} {...form.register("tipMethod")} />
        <Textarea tone="light" className={styles.full} label="Nota del corte (la ve el cliente y el próximo barbero)" placeholder="Ej: máquina 1 a los costados, tijera arriba, pomada mate" {...form.register("cutNote")} />
      </div>

      {needsDebt && (
        <Card tone="light">
          <p className={styles.dangerText}>{needsDebt}</p>
          <Button variant="danger" onClick={() => submit(true)} loading={complete.isPending}>Autorizar deuda y cerrar</Button>
        </Card>
      )}
      <div className={styles.row}>
        <Button variant="light" onClick={onBack}>Volver</Button>
        <span className={styles.spacer} />
        <Button loading={complete.isPending} onClick={() => submit(false)}>Cerrar turno</Button>
      </div>
    </div>
  );
}

function CancelForm({ appointment: a, onDone, onBack }: { appointment: Appointment; onDone: () => void; onBack: () => void }) {
  const [by, setBy] = useState<"client" | "business" | "no_show">("client");
  const [reason, setReason] = useState("");
  const cancel = useAdminAction(() => adminApi.post<Appointment>(`appointments/${a._id}/cancel`, { by, reason }), {
    success: (r) => (r.cancellation?.depositRetained ? "Cancelado. La seña queda retenida." : "Turno cancelado"),
    onSuccess: onDone,
  });
  return (
    <div className={styles.stack}>
      <div className={styles.chips}>
        {(["client", "business", "no_show"] as const).map((b) => (
          <button key={b} className={`${styles.chip} ${by === b ? styles.chipActive : ""}`} onClick={() => setBy(b)}>{CANCEL_BY_LABELS[b]}</button>
        ))}
      </div>
      <Input tone="light" label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
      <p className={styles.small}>Si canceló el cliente con menos anticipación que la política, o no vino, la seña queda retenida automáticamente. Si cancela la barbería, la seña queda como saldo a favor del cliente.</p>
      <div className={styles.row}>
        <Button variant="light" onClick={onBack}>Volver</Button>
        <span className={styles.spacer} />
        <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate(undefined)}>Confirmar</Button>
      </div>
    </div>
  );
}

function RescheduleForm({ appointment: a, onDone, onBack }: { appointment: Appointment; onDone: () => void; onBack: () => void }) {
  const [date, setDate] = useState(isoDay(new Date(a.startsAt)));
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  useEffect(() => {
    bookingApi.availability({ location: a.location._id, service: a.service._id, date, barber: a.barber._id }).then((r) => setSlots(r.barbers[0]?.slots ?? []));
  }, [date, a]);
  const save = useAdminAction(() => adminApi.post(`appointments/${a._id}/reschedule`, { date, time: slot }), { success: "Turno reprogramado", onSuccess: onDone });
  return (
    <div className={styles.stack}>
      <input type="date" className={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
      <div className={styles.chips}>
        {slots.map((s) => <button key={s} className={`${styles.chip} ${slot === s ? styles.chipActive : ""}`} onClick={() => setSlot(s)}>{s}</button>)}
        {!slots.length && <span className={styles.muted}>Sin horarios libres ese día</span>}
      </div>
      <div className={styles.row}>
        <Button variant="light" onClick={onBack}>Volver</Button>
        <span className={styles.spacer} />
        <Button disabled={!slot} loading={save.isPending} onClick={() => save.mutate(undefined)}>Guardar</Button>
      </div>
    </div>
  );
}

function NewAppointmentModal({ onClose, defaultDate }: { onClose: () => void; defaultDate: string }) {
  const location = useAdminStore((s) => s.location);
  const { data: services } = useServices(location ? { location } : undefined);
  const { data: barbers } = useAdminQuery<Paged<{ _id: string; name: string }>>("barbers", { location: location || undefined, status: "active", limit: 100 });
  const form = useForm({ defaultValues: { service: "", barber: "any", date: defaultDate, time: "", name: "", phone: "", notes: "", source: "walkin" } });
  const v = form.watch();
  const [slots, setSlots] = useState<string[]>([]);
  useEffect(() => {
    if (!location || !v.service || !v.date) return;
    bookingApi.availability({ location, service: v.service, date: v.date, barber: v.barber }).then((r) => setSlots(v.barber === "any" ? r.slots : (r.barbers[0]?.slots ?? [])));
  }, [location, v.service, v.date, v.barber]);
  const create = useAdminAction(
    () => adminApi.post("appointments", { location, service: v.service, barber: v.barber, date: v.date, time: v.time, customer: { name: v.name, phone: v.phone }, notes: v.notes || undefined, source: v.source }),
    { success: "Turno agendado", onSuccess: onClose },
  );
  return (
    <Modal open onClose={onClose} title="Nuevo turno" size="lg" footer={<Button loading={create.isPending} disabled={!v.time || !v.name || !v.phone} onClick={() => create.mutate(undefined)}>Agendar</Button>}>
      <div className={styles.formGrid}>
        <div className={styles.full}><LocationPicker /></div>
        <Select tone="light" label="Servicio" placeholder="Elegí" options={(services ?? []).map((s) => ({ value: s._id, label: `${s.name} · ${money(s.price)}` }))} {...form.register("service")} />
        <Select tone="light" label="Barbero" options={[{ value: "any", label: "Cualquiera" }, ...(barbers?.items ?? []).map((b) => ({ value: b._id, label: b.name }))]} {...form.register("barber")} />
        <Input tone="light" label="Fecha" type="date" {...form.register("date")} />
        <Select tone="light" label="Hora" placeholder={slots.length ? "Elegí" : "Sin horarios"} options={slots.map((s) => ({ value: s, label: s }))} {...form.register("time")} />
        <Input tone="light" label="Cliente" {...form.register("name")} />
        <Input tone="light" label="Celular" {...form.register("phone")} />
        <Select tone="light" label="Origen" options={[{ value: "walkin", label: "Vino sin turno" }, { value: "whatsapp", label: "WhatsApp" }, { value: "admin", label: "Teléfono / otro" }]} {...form.register("source")} />
        <Input tone="light" label="Nota" {...form.register("notes")} />
      </div>
      <p className={styles.small}>Los turnos cargados desde el panel quedan confirmados sin seña.</p>
    </Modal>
  );
}
