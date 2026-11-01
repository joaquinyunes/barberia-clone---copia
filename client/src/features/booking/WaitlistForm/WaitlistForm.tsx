import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Input, toast } from "@/components/ui";
import { errorMessage } from "@/services/http";
import { bookingApi } from "../booking.api";
import styles from "./WaitlistForm.module.css";

/** Para un día sin horarios: deja nombre y celular y la barbería avisa por WhatsApp si alguien cancela. */
export function WaitlistForm({ location, service, barber, date }: { location: string; service: string; barber: string; date: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const join = useMutation({
    mutationFn: () => bookingApi.joinWaitlist({ location, service, barber, date, customer: { name, phone } }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (join.data) return <p className={styles.done}>Listo, estás en la lista (lugar {join.data.position}). Si se libera un horario te avisamos por WhatsApp y lo guardamos 15 minutos para vos.</p>;
  return (
    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); join.mutate(); }}>
      <h3>Avisame si se libera un horario</h3>
      <Input label="Nombre y apellido" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Celular (WhatsApp)" type="tel" autoComplete="tel" placeholder="11 5555-5555" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Button type="submit" variant="dark" disabled={name.trim().length < 2 || phone.trim().length < 8 || join.isPending}>Anotarme en la lista de espera</Button>
    </form>
  );
}
