import { useState } from "react";
import { IoLogoWhatsapp } from "react-icons/io5";
import { Button, Card, DataTable, Stat, Tabs } from "@/components/ui";
import { LocationPicker } from "@/features/admin/components/LocationPicker/LocationPicker";
import { Money } from "@/features/admin/components/Money/Money";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminStore } from "@/features/admin/adminStore";
import { useAdminQuery } from "@/features/admin/hooks/useAdmin";
import { currentPeriod, date, isoDay, money, periodLabel } from "@/utils/format";
import { METHOD_LABELS } from "@/utils/labels";
import styles from "./admin.module.css";

interface Pnl {
  appointments: number; discounts: number; income: Record<string, number>; totalIncome: number; costs: Record<string, number>; totalCosts: number;
  grossMargin: number; expenses: { category: string; total: number }[]; totalExpenses: number; operatingResult: number; marginPct: number; purchases: { total: number; count: number }; note: string;
}
interface RankingRow { barber: { _id: string; name: string }; clients: number; services: number; revenue: number; avgTicket: number; commissions: number; tips: number; cancelled: number; noShows: number; hoursWorked: number; overtimeHours: number; occupancyPct: number | null; revenuePerHour: number | null }
interface Margin { service: string; count: number; revenue: number; commissions: number; supplies: number; margin: number; marginPct: number; marginPerHour: number }
interface AtRisk { _id: string; name: string; phone: string; visits: number; lastVisitAt: string; preferredBarber?: string; daysSince: number; expectedEvery: number; whatsapp: string }
interface Daily { date: string; appointments: { completed: number; cancelled: number; noShows: number }; sales: number; tips: number; byMethod: Record<string, number>; expenses: number; advances: number; net: number }

const INCOME: Record<string, string> = { services: "Servicios realizados", products: "Productos", memberships: "Membresías", packs: "Packs", giftCardsSold: "Gift cards vendidas", retainedDeposits: "Señas retenidas" };
const COSTS: Record<string, string> = { commissions: "Comisiones", bonusAndOvertime: "Bonos y horas extra", supplies: "Insumos por servicio", productCost: "Costo de productos vendidos", paymentFees: "Comisiones de medios de pago" };

export default function ReportsPage() {
  const [tab, setTab] = useState("resultados");
  const [period, setPeriod] = useState(currentPeriod());
  const location = useAdminStore((s) => s.location);
  return (
    <>
      <PageHeader title="Reportes" subtitle={periodLabel(period)} actions={<><LocationPicker allowAll /><input type="month" className={styles.month} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Período" /></>} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: "resultados", label: "Resultados" },
        { value: "ranking", label: "Ranking operativo" },
        { value: "margenes", label: "Margen por servicio" },
        { value: "cierre", label: "Cierre diario" },
        { value: "riesgo", label: "Clientes en riesgo" },
      ]} />
      {tab === "resultados" && <PnlReport period={period} location={location} />}
      {tab === "ranking" && <Ranking period={period} location={location} />}
      {tab === "margenes" && <Margins period={period} />}
      {tab === "cierre" && <DailyClose location={location} />}
      {tab === "riesgo" && <AtRiskClients />}
    </>
  );
}

function PnlReport({ period, location }: { period: string; location: string }) {
  const { data } = useAdminQuery<Pnl>("reports/pnl", { period, location: location || undefined });
  if (!data) return null;
  return (
    <>
      <div className={styles.stats}>
        <Stat label="Ingresos" value={money(data.totalIncome)} />
        <Stat label="Costos directos" value={money(data.totalCosts)} tone="negative" />
        <Stat label="Gastos" value={money(data.totalExpenses)} tone="negative" />
        <Stat label="Resultado operativo" value={money(data.operatingResult)} tone={data.operatingResult >= 0 ? "positive" : "negative"} hint={`Margen ${data.marginPct}%`} />
        <Stat label="Compras de stock" value={money(data.purchases.total)} hint={`${data.purchases.count} compras (flujo de caja)`} />
      </div>
      <div className={styles.threeCols}>
        <Card tone="light" title="Ingresos">
          <ul className={styles.lines}>{Object.entries(data.income).map(([k, v]) => <li key={k}><span>{INCOME[k]}</span><span>{money(v)}</span></li>)}</ul>
          <p className={styles.total}><span>Total</span><span>{money(data.totalIncome)}</span></p>
          <p className={styles.small}>{data.appointments} servicios · descuentos otorgados {money(data.discounts)}</p>
        </Card>
        <Card tone="light" title="Costos directos">
          <ul className={styles.lines}>{Object.entries(data.costs).map(([k, v]) => <li key={k}><span>{COSTS[k]}</span><span>−{money(v)}</span></li>)}</ul>
          <p className={styles.total}><span>Margen bruto</span><Money value={data.grossMargin} strong /></p>
        </Card>
        <Card tone="light" title="Gastos">
          <ul className={styles.lines}>{data.expenses.map((e) => <li key={e.category}><span>{e.category}</span><span>−{money(e.total)}</span></li>)}</ul>
          <p className={styles.total}><span>Resultado</span><Money value={data.operatingResult} strong /></p>
        </Card>
      </div>
      <p className={styles.small}>{data.note}</p>
    </>
  );
}

function Ranking({ period, location }: { period: string; location: string }) {
  const { data, isLoading } = useAdminQuery<RankingRow[]>("reports/ranking", { period, location: location || undefined });
  return (
    <Card tone="light" padded={false}>
      <DataTable loading={isLoading} rows={data} rowKey={(r) => r.barber._id} columns={[
        { key: "b", header: "Barbero", render: (r) => <strong>{r.barber.name}</strong> },
        { key: "c", header: "Clientes", align: "right", render: (r) => r.clients },
        { key: "s", header: "Servicios", align: "right", render: (r) => r.services },
        { key: "f", header: "Facturación", align: "right", render: (r) => money(r.revenue) },
        { key: "t", header: "Ticket prom.", align: "right", render: (r) => money(r.avgTicket), hideOnMobile: true },
        { key: "co", header: "Comisiones", align: "right", render: (r) => money(r.commissions), hideOnMobile: true },
        { key: "h", header: "Horas", align: "right", render: (r) => `${r.hoursWorked} h${r.overtimeHours ? ` (+${r.overtimeHours})` : ""}`, hideOnMobile: true },
        { key: "o", header: "Ocupación", align: "right", render: (r) => (r.occupancyPct !== null ? `${r.occupancyPct}%` : "—") },
        { key: "rh", header: "$/hora", align: "right", render: (r) => (r.revenuePerHour !== null ? money(r.revenuePerHour) : "—"), hideOnMobile: true },
        { key: "x", header: "Cancel. / no-show", align: "right", render: (r) => `${r.cancelled} / ${r.noShows}` },
      ]} />
    </Card>
  );
}

function Margins({ period }: { period: string }) {
  const { data, isLoading } = useAdminQuery<Margin[]>("reports/service-margins", { period });
  return (
    <>
      <p className={styles.muted}>Cuánto deja realmente cada servicio después de comisión e insumos, y cuánto rinde cada hora de sillón.</p>
      <Card tone="light" padded={false}>
        <DataTable loading={isLoading} rows={data} rowKey={(m) => m.service} columns={[
          { key: "s", header: "Servicio", render: (m) => <strong>{m.service}</strong> },
          { key: "c", header: "Cant.", align: "right", render: (m) => m.count },
          { key: "r", header: "Facturado", align: "right", render: (m) => money(m.revenue) },
          { key: "co", header: "Comisiones", align: "right", render: (m) => money(m.commissions), hideOnMobile: true },
          { key: "i", header: "Insumos", align: "right", render: (m) => money(m.supplies), hideOnMobile: true },
          { key: "m", header: "Margen", align: "right", render: (m) => <>{money(m.margin)} <span className={styles.small}>({m.marginPct}%)</span></> },
          { key: "h", header: "Margen por hora", align: "right", render: (m) => <strong>{money(m.marginPerHour)}</strong> },
        ]} />
      </Card>
    </>
  );
}

function DailyClose({ location }: { location: string }) {
  const [day, setDay] = useState(isoDay());
  const { data } = useAdminQuery<Daily>("reports/daily-close", { date: day, location: location || undefined });
  return (
    <>
      <input type="date" className={styles.input} value={day} onChange={(e) => setDay(e.target.value)} aria-label="Día" />
      {data && (
        <div className={styles.twoCols} style={{ marginTop: "1rem" }}>
          <Card tone="light" title={`Cierre del ${date(`${day}T12:00:00-03:00`)}`}>
            <dl className={styles.kv}>
              <dt>Turnos realizados</dt><dd>{data.appointments.completed}</dd>
              <dt>Cancelados / no-show</dt><dd>{data.appointments.cancelled} / {data.appointments.noShows}</dd>
              <dt>Ventas de servicios</dt><dd>{money(data.sales)}</dd>
              <dt>Propinas</dt><dd>{money(data.tips)}</dd>
              <dt>Gastos</dt><dd>−{money(data.expenses)}</dd>
              <dt>Adelantos</dt><dd>−{money(data.advances)}</dd>
            </dl>
            <p className={styles.total}><span>Neto del día</span><Money value={data.net} strong /></p>
          </Card>
          <Card tone="light" title="Por medio de pago">
            <ul className={styles.lines}>{Object.entries(data.byMethod).map(([k, v]) => <li key={k}><span>{METHOD_LABELS[k]}</span><Money value={v} /></li>)}</ul>
          </Card>
        </div>
      )}
    </>
  );
}

/** Clientes que ya deberían haber vuelto según su propia frecuencia: un toque y se les escribe. */
function AtRiskClients() {
  const { data, isLoading } = useAdminQuery<AtRisk[]>("reports/at-risk-clients");
  return (
    <Card tone="light" padded={false}>
      <DataTable loading={isLoading} rows={data} rowKey={(c) => c._id} empty="Ningún cliente en riesgo 🎉" columns={[
        { key: "n", header: "Cliente", render: (c) => <strong>{c.name}</strong> },
        { key: "v", header: "Visitas", align: "right", render: (c) => c.visits },
        { key: "f", header: "Suele venir cada", render: (c) => `${c.expectedEvery} días` },
        { key: "d", header: "No viene hace", render: (c) => <span className={styles.dangerText}>{c.daysSince} días</span> },
        { key: "b", header: "Barbero", render: (c) => c.preferredBarber ?? "—", hideOnMobile: true },
        { key: "w", header: "", render: (c) => <Button size="sm" variant="whatsapp" href={c.whatsapp} icon={<IoLogoWhatsapp />}>Escribirle</Button> },
      ]} />
    </Card>
  );
}
