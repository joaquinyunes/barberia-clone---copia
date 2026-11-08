import { useState } from "react";
import { Badge, Button, Card, DataTable, Tabs } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import { date, phoneDisplay } from "@/utils/format";

interface Review { _id: string; rating: number; recommend?: number; comment?: string; status: "published" | "hidden"; createdAt: string; barber?: { name: string }; client?: { name: string } }
interface Lapsed { _id: string; name: string; phone: string; visits: number; lastVisitAt: string; daysSince: number; consentWhatsapp: boolean; whatsapp: string | null }

export default function EngagementPage() {
  const [tab, setTab] = useState("lapsed");
  return (
    <>
      <PageHeader title="Fidelización" subtitle="Opiniones verificadas, clientes que no vuelven y campañas (solo a quienes aceptaron recibirlas)." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "lapsed", label: "No vuelven" }, { value: "reviews", label: "Opiniones" }]} />
      {tab === "lapsed" ? <LapsedTab /> : <ReviewsTab />}
    </>
  );
}

function LapsedTab() {
  const [days, setDays] = useState(45);
  const { data, isLoading } = useAdminQuery<{ items: Lapsed[] }>("engagement/lapsed", { days });
  return (
    <Card tone="light" padded={false} title={`Clientes que no vuelven hace más de ${days} días`}>
      <div style={{ padding: "0 1rem 1rem", display: "flex", gap: 8 }}>
        {[30, 45, 60, 90].map((d) => <Button key={d} size="sm" variant={d === days ? "dark" : "light"} onClick={() => setDays(d)}>{d} días</Button>)}
      </div>
      <DataTable
        loading={isLoading}
        rows={data?.items}
        rowKey={(c) => c._id}
        columns={[
          { key: "n", header: "Cliente", render: (c) => <>{c.name}<div><small>{phoneDisplay(c.phone)}</small></div></> },
          { key: "v", header: "Visitas", render: (c) => c.visits, hideOnMobile: true },
          { key: "l", header: "Última visita", render: (c) => `${date(c.lastVisitAt)} (${c.daysSince} d)` },
          { key: "c", header: "Campañas", render: (c) => <Badge tone={c.consentWhatsapp ? "success" : "neutral"}>{c.consentWhatsapp ? "Aceptó" : "Sin consentimiento"}</Badge> },
          { key: "a", header: "", render: (c) => (c.whatsapp ? <Button size="sm" variant="light" href={c.whatsapp}>Escribir por WhatsApp</Button> : null) },
        ]}
      />
    </Card>
  );
}

function ReviewsTab() {
  const { data, isLoading } = useAdminQuery<{ items: Review[]; summary: { count: number; average: number | null; nps: number | null } }>("engagement/reviews");
  const toggle = useAdminAction((r: Review) => adminApi.patch(`engagement/reviews/${r._id}`, { status: r.status === "hidden" ? "published" : "hidden" }), { success: "Listo" });
  return (
    <Card tone="light" padded={false} title={data ? `${data.summary.count} opiniones · promedio ${data.summary.average ?? "—"} · NPS ${data.summary.nps ?? "—"}` : "Opiniones"}>
      <DataTable
        loading={isLoading}
        rows={data?.items}
        rowKey={(r) => r._id}
        columns={[
          { key: "d", header: "Fecha", render: (r) => date(r.createdAt) },
          { key: "b", header: "Barbero", render: (r) => r.barber?.name ?? "—", hideOnMobile: true },
          { key: "r", header: "Nota", render: (r) => `${r.rating} ★${r.recommend !== undefined ? ` · recomienda ${r.recommend}/10` : ""}` },
          { key: "c", header: "Comentario", render: (r) => r.comment ?? "—" },
          { key: "a", header: "", render: (r) => <Button size="sm" variant="light" onClick={() => toggle.mutate(r)}>{r.status === "hidden" ? "Publicar" : "Ocultar"}</Button> },
        ]}
      />
    </Card>
  );
}
