import { useMemo, useState } from "react";
import type { Location, Service } from "@/types";

export type Step = "location" | "service" | "barber" | "datetime" | "details" | "payment";
export const STEPS: { key: Step; label: string }[] = [
  { key: "location", label: "Sede" },
  { key: "service", label: "Servicio" },
  { key: "barber", label: "Barbero" },
  { key: "datetime", label: "Día y hora" },
  { key: "details", label: "Tus datos" },
  { key: "payment", label: "Seña y WhatsApp" },
];

export interface Selection {
  location?: Location;
  service?: Service;
  barber?: { _id: string; name: string } | "any";
  date?: string;
  time?: string;
}

/** Estado del asistente de reserva, separado de la UI. */
export function useBookingWizard(initial: Selection = {}) {
  const [selection, setSelection] = useState<Selection>(initial);
  const [step, setStep] = useState<Step>(initial.location ? (initial.service ? "barber" : "service") : "location");
  const index = STEPS.findIndex((s) => s.key === step);

  const choose = <K extends keyof Selection>(key: K, value: Selection[K]) => {
    setSelection((s) => {
      const next = { ...s, [key]: value };
      // cambiar un paso anterior invalida los siguientes
      if (key === "location") Object.assign(next, { service: undefined, barber: undefined, date: undefined, time: undefined });
      if (key === "service") Object.assign(next, { barber: undefined, time: undefined });
      if (key === "barber") Object.assign(next, { time: undefined });
      if (key === "date") Object.assign(next, { time: undefined });
      return next;
    });
  };

  const canGo = useMemo(
    () => ({
      location: true,
      service: !!selection.location,
      barber: !!selection.service,
      datetime: !!selection.barber,
      details: !!selection.time,
      payment: false, // se habilita al crear la reserva
    }),
    [selection],
  );

  return {
    step,
    index,
    selection,
    choose,
    canGo,
    goTo: (s: Step) => setStep(s),
    next: () => setStep(STEPS[Math.min(index + 1, STEPS.length - 1)].key),
    back: () => setStep(STEPS[Math.max(index - 1, 0)].key),
  };
}
