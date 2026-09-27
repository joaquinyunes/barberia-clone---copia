import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IoCalendarOutline } from "react-icons/io5";
import { paths } from "@/app/router/paths";
import { Badge, Button, Card, Container, EmptyState, Modal, PageLoader, Section, toast } from "@/components/ui";
import { bookingApi } from "@/features/booking/booking.api";
import { DateStrip } from "@/features/booking/DateStrip/DateStrip";
import { PaymentPanel } from "@/features/booking/PaymentPanel/PaymentPanel";
import { TimeSlots } from "@/features/booking/TimeSlots/TimeSlots";
import { useSite } from "@/features/catalog/useCatalog";
import { errorMessage } from "@/services/http";
import type { Appointment } from "@/types";
import { dateTime, longDate, money, time } from "@/utils/format";
import { STATUS_LABELS, STATUS_TONE } from "@/utils/labels";
import styles from "./BookingManagePage.module.css";

export default function BookingManagePage() {
  const { code = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const qc = useQueryClient();
  const { data: site } = useSite();
  const { data, isLoading, isError, error } = useQuery<Appointment & { location: { _id: string; name: string; address: string; whatsapp: string } }>({
    queryKey: ["booking", code],
    queryFn: () => bookingApi.get(code, token),
    enabled: !!token,
  });
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState<string>();
  const [newTime, setNewTime] = useState<string>();

  const cancel = useMutation({
    mutationFn: () => bookingApi.cancel(code, token),
    onSuccess: (r) => {
      toast.success(r.depositRetained ? "Turno cancelado. Como faltaban menos de 12 h, la seña queda retenida." : "Turno cancelado. Tu seña queda como saldo a favor.");
      qc.invalidateQueries({ queryKey: ["booking", code] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const slots = useQuery({
    queryKey: ["availability-manage", code, newDate],
    queryFn: () => bookingApi.availability({ location: data!.location._id, service: data!.service._id, date: newDate!, barber: data!.barber._id }),
    enabled: !!(rescheduling && newDate && data),
  });
  const reschedule = useMutation({
    mutationFn: () => bookingApi.reschedule(code, token, newDate!, newTime!),
    onSuccess: () => {
      toast.success("¡Turno reprogramado!");
      setRescheduling(false);
      qc.invalidateQueries({ queryKey: ["booking", code] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!token) return <Section className={styles.page}><Container narrow><EmptyState title="Link incompleto">Usá el link que te dimos al reservar.</EmptyState></Container></Section>;
  if (isLoading) return <PageLoader />;
  if (isError || !data) return <Section className={styles.page}><Container narrow><EmptyState title="No pudimos abrir tu reserva">{errorMessage(error)}</EmptyState></Container></Section>;

  const active = ["pending_payment", "payment_review", "confirmed"].includes(data.status);
  return (
    <Section className={styles.page}>
      <title>{`Reserva ${data.code} · Jack el Barbero`}</title>
      <Container narrow>
        <header className={styles.head}>
          <span>Reserva {data.code}</span>
          <h1>{data.service.name}</h1>
          <Badge tone={STATUS_TONE[data.status]}>{STATUS_LABELS[data.status]}</Badge>
        </header>
        <Card className={styles.card}>
          <dl className={styles.details}>
            <div><dt>Cuándo</dt><dd>{longDate(data.startsAt)} · {time(data.startsAt)} h</dd></div>
            <div><dt>Dónde</dt><dd>{data.location.name} — {data.location.address}</dd></div>
            <div><dt>Barbero</dt><dd>{data.barber.name}</dd></div>
            <div><dt>Total</dt><dd>{money(data.total)}{data.discount ? ` (−${money(data.discount)})` : ""}</dd></div>
            <div><dt>Seña</dt><dd>{data.deposit.paid ? `${money(data.deposit.paid)} abonada` : data.deposit.required ? `${money(data.deposit.required)} pendiente` : "No requiere"}</dd></div>
            {data.cancellation?.at && <div><dt>Cancelado</dt><dd>{dateTime(data.cancellation.at)}</dd></div>}
          </dl>
          {active && (
            <div className={styles.actions}>
              <Button variant="dark" href={bookingApi.calendarUrl(code, token)} icon={<IoCalendarOutline />}>Agregar al calendario</Button>
              <Button variant="outline" onClick={() => setRescheduling(true)}>Reprogramar</Button>
              <Button variant="ghost" loading={cancel.isPending} onClick={() => window.confirm("¿Seguro que querés cancelar el turno?") && cancel.mutate()}>Cancelar turno</Button>
            </div>
          )}
          {site && <p className={styles.policy}>Podés cancelar o reprogramar online sin costo hasta {site.cancellationHours} h antes.</p>}
        </Card>

        {data.status === "pending_payment" && data.deposit.required > 0 && (
          <Card className={styles.card} title="Completá la seña">
            {data.deposit.rejectedReason && <p className={styles.rejected}>El comprobante anterior fue rechazado: {data.deposit.rejectedReason}</p>}
            <PaymentPanel kind="bookings" code={code} token={token} amount={data.deposit.required} bank={{ alias: (data.location as { bankAlias?: string }).bankAlias }} onDone={() => qc.invalidateQueries({ queryKey: ["booking", code] })} />
          </Card>
        )}
        {data.status === "payment_review" && (
          <Card className={styles.card} title="Estamos revisando tu comprobante">
            <p>En cuanto lo aprobemos, el turno queda confirmado. Si todavía no nos escribiste, mandanos la reserva por WhatsApp:</p>
            <PaymentPanel kind="bookings" code={code} token={token} amount={data.deposit.required} bank={{}} initialStatus="payment_review" />
          </Card>
        )}
        <Button variant="outline" to={paths.booking}>Hacer otra reserva</Button>
      </Container>

      <Modal open={rescheduling} onClose={() => setRescheduling(false)} title="Elegí un nuevo horario" tone="dark" size="lg"
        footer={<Button disabled={!newTime} loading={reschedule.isPending} onClick={() => reschedule.mutate()}>Confirmar nuevo horario</Button>}>
        <DateStrip value={newDate} onChange={(d) => { setNewDate(d); setNewTime(undefined); }} />
        <div style={{ marginTop: "1.5rem" }}>
          {newDate && <TimeSlots slots={slots.data?.barbers[0]?.slots} loading={slots.isFetching} closed={slots.data?.closed} value={newTime} onChange={setNewTime} />}
        </div>
      </Modal>
    </Section>
  );
}
