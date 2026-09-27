import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IoArrowBack, IoCheckmarkCircle } from "react-icons/io5";
import { Link } from "react-router-dom";
import { paths } from "@/app/router/paths";
import { Button, Input, Skeleton, Textarea, toast } from "@/components/ui";
import { useBarbers, useLocations, useServices } from "@/features/catalog/useCatalog";
import { errorCode, errorMessage } from "@/services/http";
import type { Location, Service } from "@/types";
import { cx, isoDay, money } from "@/utils/format";
import { CATEGORY_LABELS } from "@/utils/labels";
import { bookingApi, type BookingResult } from "../booking.api";
import { BookingSummary } from "../BookingSummary/BookingSummary";
import { DateStrip } from "../DateStrip/DateStrip";
import { PaymentPanel } from "../PaymentPanel/PaymentPanel";
import { StepPicker } from "../StepPicker/StepPicker";
import { TimeSlots } from "../TimeSlots/TimeSlots";
import { STEPS, useBookingWizard } from "../useBookingWizard";
import styles from "./BookingWizard.module.css";

const detailsSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre"),
  phone: z.string().trim().regex(/^[\d\s+()-]{8,}$/, "Ingresá un celular válido (con código de área)"),
  email: z.string().trim().email("Email inválido").or(z.literal("")),
  notes: z.string().max(300).optional(),
  promoCode: z.string().optional(),
  referralCode: z.string().optional(),
});
type Details = z.infer<typeof detailsSchema>;

export function BookingWizard({ initialLocation, initialService }: { initialLocation?: string; initialService?: string }) {
  const { data: locations } = useLocations();
  const wizard = useBookingWizard();
  const { step, selection, choose, goTo, next, back, index, canGo } = wizard;
  const [result, setResult] = useState<BookingResult>();
  const [promo, setPromo] = useState<{ discount: number; total: number; name?: string }>();

  // Preselección desde la URL (?location=palermo&service=<id>)
  const { data: allServices } = useServices();
  useEffect(() => {
    if (!locations || selection.location) return;
    const loc = locations.find((l) => l.slug === initialLocation || l._id === initialLocation);
    if (loc) {
      choose("location", loc);
      goTo("service");
    } else if (locations.length === 1) {
      choose("location", locations[0]);
      goTo("service");
    }
  }, [locations]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!initialService || !allServices || !selection.location || selection.service) return;
    const svc = allServices.find((s) => s._id === initialService || s.slug === initialService);
    if (svc && (!svc.locations?.length || svc.locations.includes(selection.location._id))) {
      choose("service", svc);
      goTo("barber");
    }
  }, [allServices, selection.location]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: services, isLoading: loadingServices } = useServices(selection.location ? { location: selection.location._id } : undefined);
  const { data: barbers, isLoading: loadingBarbers } = useBarbers(selection.location ? { location: selection.location._id, service: selection.service?._id } : { location: "" });

  const barberId = selection.barber === "any" ? "any" : selection.barber?._id;
  const { data: availability, isFetching: loadingSlots } = useQuery({
    queryKey: ["availability", selection.location?._id, selection.service?._id, barberId, selection.date],
    queryFn: () => bookingApi.availability({ location: selection.location!._id, service: selection.service!._id, date: selection.date!, barber: barberId }),
    enabled: !!(selection.location && selection.service && selection.barber && selection.date),
    refetchInterval: 60_000,
  });
  const slots = useMemo(() => {
    if (!availability) return undefined;
    if (barberId === "any") return availability.slots;
    return availability.barbers.find((b) => b.barber._id === barberId)?.slots ?? [];
  }, [availability, barberId]);

  const form = useForm<Details>({ resolver: zodResolver(detailsSchema), defaultValues: { name: "", phone: "", email: "", notes: "", promoCode: "", referralCode: "" } });

  const create = useMutation({
    mutationFn: (d: Details) =>
      bookingApi.create({
        location: selection.location!._id,
        service: selection.service!._id,
        barber: barberId!,
        date: selection.date!,
        time: selection.time!,
        customer: { name: d.name, phone: d.phone, email: d.email || undefined },
        notes: d.notes || undefined,
        promoCode: d.promoCode || undefined,
        referralCode: d.referralCode || undefined,
      }),
    onSuccess: (r) => {
      setResult(r);
      goTo("payment");
    },
    onError: (err) => {
      toast.error(errorMessage(err));
      if (errorCode(err) === "CONFLICT") goTo("datetime");
    },
  });

  const checkPromo = async () => {
    const code = form.getValues("promoCode");
    if (!code || !selection.service || !selection.date || !selection.time) return;
    try {
      const r = await bookingApi.validatePromo({ code, service: selection.service._id, date: selection.date, time: selection.time });
      setPromo(r);
      toast.success(`Código aplicado: ${r.name} (−${money(r.discount)})`);
    } catch (err) {
      setPromo(undefined);
      form.setError("promoCode", { message: errorMessage(err) });
    }
  };

  const closedDays = selection.location?.openingHours.filter((h) => h.closed).map((h) => h.day) ?? [];
  const servicesByCat = useMemo(() => {
    const map = new Map<string, Service[]>();
    services?.forEach((s) => map.set(s.category, [...(map.get(s.category) ?? []), s]));
    return [...map.entries()];
  }, [services]);

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <ol className={styles.progress} aria-label="Pasos de la reserva">
          {STEPS.map((s, i) => (
            <li key={s.key} className={cx(i < index && styles.past, s.key === step && styles.current)}>
              <button disabled={!canGo[s.key] || !!result} onClick={() => goTo(s.key)}>
                <span>{i < index ? <IoCheckmarkCircle /> : i + 1}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>

        {index > 0 && !result && (
          <button className={styles.back} onClick={back}><IoArrowBack /> Volver</button>
        )}

        {step === "location" && (
          <section>
            <h2>¿En qué sede?</h2>
            {!locations ? <Skeleton height={200} /> : (
              <StepPicker
                columns={1}
                value={selection.location?._id}
                onChange={(id) => {
                  choose("location", locations.find((l) => l._id === id) as Location);
                  next();
                }}
                options={locations.map((l) => ({ id: l._id, title: l.name, subtitle: l.address, image: l.heroImage, badge: l.isVip ? "La Cava VIP" : undefined }))}
              />
            )}
          </section>
        )}

        {step === "service" && (
          <section>
            <h2>¿Qué te hacemos?</h2>
            {loadingServices ? <Skeleton height={300} /> : servicesByCat.map(([cat, list]) => (
              <div key={cat} className={styles.category}>
                <h3>{CATEGORY_LABELS[cat] ?? cat}</h3>
                <StepPicker
                  value={selection.service?._id}
                  onChange={(id) => {
                    choose("service", list.find((s) => s._id === id));
                    next();
                  }}
                  options={list.map((s) => ({ id: s._id, title: s.name, subtitle: `${s.durationMin} min${s.description ? ` · ${s.description}` : ""}`, aside: money(s.price) }))}
                />
              </div>
            ))}
          </section>
        )}

        {step === "barber" && (
          <section>
            <h2>¿Con quién?</h2>
            {loadingBarbers ? <Skeleton height={200} /> : (
              <StepPicker
                value={selection.barber === "any" ? "any" : selection.barber?._id}
                onChange={(id) => {
                  choose("barber", id === "any" ? "any" : { _id: id, name: barbers!.find((b) => b._id === id)!.name });
                  if (!selection.date) choose("date", isoDay());
                  next();
                }}
                options={[
                  { id: "any", title: "Cualquier barbero", subtitle: "Te asignamos al primero disponible — más horarios", image: "" },
                  ...(barbers ?? []).map((b) => ({ id: b._id, title: b.name, subtitle: b.specialties?.join(" · "), image: b.photo })),
                ]}
              />
            )}
          </section>
        )}

        {step === "datetime" && (
          <section>
            <h2>¿Cuándo?</h2>
            <DateStrip value={selection.date} onChange={(d) => choose("date", d)} closedDays={closedDays} />
            <div className={styles.slots}>
              <TimeSlots slots={slots} loading={loadingSlots && !availability} closed={availability?.closed} value={selection.time} onChange={(t) => choose("time", t)} />
            </div>
            <Button size="lg" disabled={!selection.time} onClick={next}>Continuar</Button>
          </section>
        )}

        {step === "details" && (
          <section>
            <h2>Tus datos</h2>
            <form className={styles.form} onSubmit={form.handleSubmit((d) => create.mutate(d))} noValidate>
              <Input label="Nombre y apellido" autoComplete="name" {...form.register("name")} error={form.formState.errors.name?.message} />
              <Input label="Celular (WhatsApp)" type="tel" autoComplete="tel" placeholder="11 5555-5555" {...form.register("phone")} error={form.formState.errors.phone?.message} />
              <Input label="Email (opcional)" type="email" autoComplete="email" {...form.register("email")} error={form.formState.errors.email?.message} />
              <Textarea label="¿Algo que tu barbero deba saber? (opcional)" placeholder="Ej: degradé bajo, dejo largo arriba…" {...form.register("notes")} />
              <div className={styles.promo}>
                <Input label="Código de descuento" {...form.register("promoCode")} error={form.formState.errors.promoCode?.message} hint={promo ? `✓ ${promo.name}: −${money(promo.discount)}` : undefined} />
                <Button type="button" variant="dark" onClick={checkPromo}>Aplicar</Button>
              </div>
              <Input label="¿Te recomendó alguien? Código de referido (opcional)" {...form.register("referralCode")} hint="Tu amigo suma crédito y vos tenés descuento en tu primera visita." />
              <p className={styles.legal}>
                Al reservar aceptás la <Link to={paths.legal("cancelaciones")}>política de cancelación</Link>: podés cancelar o reprogramar gratis hasta 12 h antes.
              </p>
              <Button type="submit" size="lg" loading={create.isPending}>Reservar y pasar a la seña</Button>
            </form>
          </section>
        )}

        {step === "payment" && result && (
          <section>
            <div className={styles.success}>
              <IoCheckmarkCircle size={40} />
              <div>
                <h2>¡Horario reservado!</h2>
                <p>Código <strong>{result.code}</strong>. Para confirmarlo, completá estos 3 pasos.</p>
              </div>
            </div>
            {result.deposit > 0 ? (
              <PaymentPanel kind="bookings" code={result.code} token={result.token} amount={result.deposit} bank={result.bank} holdExpiresAt={result.holdExpiresAt} />
            ) : (
              <p>Tu turno ya está confirmado. ¡Te esperamos!</p>
            )}
            <div className={styles.after}>
              <Button variant="outline" to={paths.bookingManage(result.code, result.token)}>Ver / gestionar mi reserva</Button>
              {result.referralCode && <p className={styles.referral}>Tu código para invitar amigos: <strong>{result.referralCode}</strong></p>}
            </div>
          </section>
        )}
      </div>

      <BookingSummary selection={selection} discount={result?.discount ?? promo?.discount} total={result?.total ?? promo?.total} />
    </div>
  );
}
