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
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "lapsed", label: "No vuelven" }, { value: "reviews", label: "Opiniones" }, { value: "import", label: "Importar clientes" }]} />
      {tab === "lapsed" ? <LapsedTab /> : tab === "reviews" ? <ReviewsTab /> : <ImportTab />}
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

interface ImportResult { created: number; skipped: number; invalid: { line: number; reason: string }[] }

/** Trae los clientes de la herramienta anterior: CSV con columnas nombre, teléfono y email. */
function ImportTab() {
  const [result, setResult] = useState<ImportResult>();
  const run = useAdminAction((csv: string) => adminApi.post<ImportResult>("clients/import", { csv }), { success: "Importación terminada", onSuccess: setResult });
  return (
    <Card tone="light" title="Importar clientes desde un CSV">
      <p>Exportá tus clientes de la herramienta anterior a CSV con las columnas <strong>nombre</strong>, <strong>teléfono</strong> y <strong>email</strong> (en cualquier orden). Los que ya existen por teléfono no se pisan. Los importados <strong>no</strong> quedan con permiso para recibir campañas.</p>
      <input
        type="file"
        accept=".csv,text/csv"
        aria-label="Archivo CSV de clientes"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) run.mutate(await file.text());
          e.target.value = "";
        }}
      />
      {run.isPending && <p>Importando…</p>}
      {result && (
        <div role="status">
          <p><strong>{result.created}</strong> clientes nuevos · <strong>{result.skipped}</strong> ya existían · <strong>{result.invalid.length}</strong> filas con error</p>
          {result.invalid.length > 0 && <ul>{result.invalid.map((i) => <li key={i.line}>Fila {i.line}: {i.reason}</li>)}</ul>}
        </div>
      )}
    </Card>
  );
}
