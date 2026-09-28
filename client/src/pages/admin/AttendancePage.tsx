import { useState } from "react";
import { Badge, Button, Card, DataTable } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { Paged } from "@/types";
import { isoDay, minutesToHours, time } from "@/utils/format";
import styles from "./admin.module.css";

interface Row { _id: string; barber: { _id: string; name: string }; date: string; checkIn?: string; checkOut?: string; workedMinutes: number; lateMinutes: number; overtimeMinutes: number; status: string; scheduledStart?: string }

const STATUS: Record<string, { label: string; tone: "success" | "danger" | "warning" | "neutral" }> = {
  present: { label: "Presente", tone: "success" },
  absent: { label: "Ausente", tone: "danger" },
  justified: { label: "Justificada", tone: "warning" },
  day_off: { label: "Franco", tone: "neutral" },
};

export default function AttendancePage() {
  const [day, setDay] = useState(isoDay());
  const { data: barbers } = useAdminQuery<Paged<{ _id: string; name: string }>>("barbers", { status: "active", limit: 100 });
  const { data, isLoading } = useAdminQuery<{ items: Row[] }>("staff/attendance", { date: day });
  const { data: month } = useAdminQuery<{ items: Row[] }>("staff/attendance", { from: `${day.slice(0, 7)}-01`, to: `${day.slice(0, 7)}-31` });
  const checkIn = useAdminAction((barber: string) => adminApi.post("staff/attendance/check-in", { barber }), { success: "Entrada registrada" });
  const checkOut = useAdminAction((barber: string) => adminApi.post("staff/attendance/check-out", { barber }), { success: "Salida registrada" });
  const absent = useAdminAction(({ barber, status }: { barber: string; status: string }) => adminApi.post("staff/attendance/absence", { barber, date: day, status }), { success: "Registrado" });
  const byBarber = new Map((data?.items ?? []).map((r) => [r.barber?._id, r]));
  const summary = new Map<string, { worked: number; extra: number; late: number; absences: number }>();
  for (const r of month?.items ?? []) {
    const s = summary.get(r.barber?.name) ?? { worked: 0, extra: 0, late: 0, absences: 0 };
    s.worked += r.workedMinutes; s.extra += r.overtimeMinutes; s.late += r.lateMinutes > 0 ? 1 : 0; s.absences += r.status === "absent" ? 1 : 0;
    summary.set(r.barber?.name, s);
  }
  return (
    <>
      <PageHeader title="Asistencia" subtitle="Entradas, salidas, tardanzas y horas extra. Los barberos también pueden fichar con su PIN." actions={<input type="date" className={styles.input} value={day} onChange={(e) => setDay(e.target.value)} aria-label="Día" />} />
      <Card tone="light" title="Hoy" padded={false}>
        <DataTable loading={isLoading} rows={barbers?.items} rowKey={(b) => b._id} columns={[
          { key: "n", header: "Barbero", render: (b) => <strong>{b.name}</strong> },
          { key: "i", header: "Entrada", render: (b) => { const r = byBarber.get(b._id); return r?.checkIn ? <>{time(r.checkIn)} {r.lateMinutes > 0 && <Badge tone="warning">+{r.lateMinutes} min</Badge>}</> : "—"; } },
          { key: "o", header: "Salida", render: (b) => { const r = byBarber.get(b._id); return r?.checkOut ? time(r.checkOut) : "—"; } },
          { key: "h", header: "Horas", render: (b) => { const r = byBarber.get(b._id); return r?.workedMinutes ? minutesToHours(r.workedMinutes) : "—"; } },
          { key: "s", header: "Estado", render: (b) => { const r = byBarber.get(b._id); return r ? <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge> : <Badge>Sin registro</Badge>; } },
          { key: "a", header: "", align: "right", render: (b) => { const r = byBarber.get(b._id); return (
            <div className={styles.row} style={{ justifyContent: "flex-end" }}>
              {!r?.checkIn && day === isoDay() && <Button size="sm" onClick={() => checkIn.mutate(b._id)}>Entrada</Button>}
              {r?.checkIn && !r.checkOut && <Button size="sm" variant="light" onClick={() => checkOut.mutate(b._id)}>Salida</Button>}
              {!r && <Button size="sm" variant="ghost" onClick={() => absent.mutate({ barber: b._id, status: "absent" })}>Ausente</Button>}
              {!r && <Button size="sm" variant="ghost" onClick={() => absent.mutate({ barber: b._id, status: "day_off" })}>Franco</Button>}
            </div>
          ); } },
        ]} />
      </Card>
      <Card tone="light" title={`Resumen del mes`} padded={false} style={{ marginTop: "1.5rem" }}>
        <DataTable rows={[...summary.entries()]} rowKey={([n]) => n} columns={[
          { key: "n", header: "Barbero", render: ([n]) => n },
          { key: "w", header: "Horas trabajadas", render: ([, s]) => minutesToHours(s.worked) },
          { key: "e", header: "Horas extra", render: ([, s]) => minutesToHours(s.extra) },
          { key: "l", header: "Llegadas tarde", align: "right", render: ([, s]) => s.late },
          { key: "a", header: "Ausencias", align: "right", render: ([, s]) => s.absences },
        ]} />
      </Card>
    </>
  );
}
