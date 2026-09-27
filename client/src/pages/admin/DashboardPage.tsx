import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoAlertCircleOutline, IoCalendarOutline, IoCashOutline, IoCubeOutline, IoPeopleOutline, IoTrendingUpOutline, IoWalletOutline } from "react-icons/io5";
import { Badge, Card, DataTable, Stat } from "@/components/ui";
import { can, useAuthStore } from "@/features/auth/authStore";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { Appointment } from "@/types";
import { currentPeriod, money, periodLabel, time } from "@/utils/format";
import { STATUS_LABELS, STATUS_TONE } from "@/utils/labels";
import styles from "./admin.module.css";

interface Dashboard {
  revenue: number;
  operatingResult: number;
  toCollect: number;
  toPay: number;
  barbers: number;
  clients: number;
  newClients: number;
  appointments: number;
  completed: number;
  noShows: number;
  cancelled: number;
  lowStock: number;
  pendingReceipts: number;
  cash: number;
  today: Appointment[];
  byDay: { _id: string; revenue: number; count: number }[];
}

export default function DashboardPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data, isLoading } = useAdminQuery<Dashboard>("reports/dashboard", { period }, { refetchInterval: 60_000 });
  const max = Math.max(1, ...(data?.byDay.map((d) => d.revenue) ?? [1]));
  const seeMoney = can(user, "reports.view");

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.name.split(" ")[0]}`}
        subtitle={`Resumen de ${periodLabel(period)}`}
        actions={<input type="month" className={styles.month} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Período" />}
      />
      {data && data.pendingReceipts > 0 && (
        <button className={styles.alert} onClick={() => navigate("/admin/turnos?status=payment_review")}>
          <IoAlertCircleOutline size={20} /> Hay <strong>{data.pendingReceipts}</strong> comprobante(s) de seña para revisar
        </button>
      )}
      <div className={styles.stats}>
        {seeMoney && <Stat label="Facturación" value={money(data?.revenue)} icon={<IoTrendingUpOutline />} hint="Ingresos del período" />}
        {seeMoney && <Stat label="Resultado operativo" value={money(data?.operatingResult)} tone={(data?.operatingResult ?? 0) >= 0 ? "positive" : "negative"} hint="Ingresos − costos − gastos" onClick={() => navigate("/admin/reportes")} />}
        {seeMoney && <Stat label="Por cobrar" value={money(data?.toCollect)} tone="positive" icon={<IoWalletOutline />} onClick={() => navigate("/admin/saldos")} />}
        {seeMoney && <Stat label="Por pagar" value={money(data?.toPay)} tone="negative" icon={<IoWalletOutline />} onClick={() => navigate("/admin/saldos")} />}
        <Stat label="Caja abierta" value={money(data?.cash)} icon={<IoCashOutline />} onClick={() => navigate("/admin/caja")} />
        <Stat label="Turnos del mes" value={data?.appointments ?? "—"} hint={`${data?.completed ?? 0} realizados`} icon={<IoCalendarOutline />} />
        <Stat label="No-show" value={data?.noShows ?? "—"} tone={(data?.noShows ?? 0) > 0 ? "warning" : "neutral"} hint={`${data?.cancelled ?? 0} cancelados`} onClick={() => navigate("/admin/cancelaciones")} />
        <Stat label="Clientes" value={data?.clients ?? "—"} hint={`${data?.newClients ?? 0} nuevos`} icon={<IoPeopleOutline />} />
        <Stat label="Barberos activos" value={data?.barbers ?? "—"} onClick={() => navigate("/admin/barberos")} />
        <Stat label="Stock bajo" value={data?.lowStock ?? "—"} tone={(data?.lowStock ?? 0) > 0 ? "warning" : "neutral"} icon={<IoCubeOutline />} onClick={() => navigate("/admin/productos")} />
      </div>
      <div className={styles.twoCols}>
        {seeMoney && (
          <Card tone="light" title="Facturación diaria">
            <div className={styles.bars} role="img" aria-label="Facturación por día">
              {data?.byDay.map((d) => (
                <div key={d._id} className={styles.barCol} title={`${d._id}: ${money(d.revenue)} (${d.count} turnos)`}>
                  <span style={{ height: `${(d.revenue / max) * 100}%` }} />
                  <small>{d._id.slice(8)}</small>
                </div>
              ))}
            </div>
          </Card>
        )}
        <Card tone="light" title="Turnos de hoy" actions={<a href="/admin/turnos" className={styles.link}>Ver agenda →</a>}>
          <DataTable
            loading={isLoading}
            rows={data?.today}
            rowKey={(a) => a._id}
            onRowClick={(a) => navigate(`/admin/turnos?code=${a.code}`)}
            empty="Sin turnos para hoy"
            columns={[
              { key: "t", header: "Hora", render: (a) => time(a.startsAt) },
              { key: "c", header: "Cliente", render: (a) => a.client?.name },
              { key: "s", header: "Servicio", render: (a) => a.service?.name, hideOnMobile: true },
              { key: "b", header: "Barbero", render: (a) => a.barber?.name, hideOnMobile: true },
              { key: "st", header: "Estado", render: (a) => <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABELS[a.status]}</Badge> },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
