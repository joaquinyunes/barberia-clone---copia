import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Card, Checkbox, DataTable, Input, Tabs } from "@/components/ui";
import { adminApi } from "@/features/admin/admin.api";
import { ResourcePage } from "@/features/admin/components/ResourcePage/ResourcePage";
import { PageHeader } from "@/features/admin/components/PageHeader/PageHeader";
import { useAdminAction, useAdminQuery } from "@/features/admin/hooks/useAdmin";
import type { Location } from "@/types";
import { money } from "@/utils/format";
import styles from "./admin.module.css";

interface Settings {
  businessName: string; whatsappMain: string; defaultCommissionPct: number; commissionOnNet: boolean; advanceMaxPctOfBalance: number; holdMinutes: number;
  cancellationHours: number; slotStepMinutes: number; clientCreditLimit: number; referralReward: number; referredDiscountPct: number; overtimeHourRate: number; blindCashClose: boolean;
  paymentMethods: { key: string; label: string; feePct: number; active: boolean }[];
  tiers: { key: string; label: string; minVisits?: number; minReferrals?: number; minDaysSinceFirstVisit?: number; withMembership?: boolean; discountPct?: number }[];
  expenseCategories: string[];
}

export default function SettingsPage() {
  const [tab, setTab] = useState("general");
  return (
    <>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "general", label: "General" }, { value: "sedes", label: "Sedes" }]} />
      {tab === "general" ? <GeneralSettings /> : <LocationsSettings />}
    </>
  );
}

function GeneralSettings() {
  const { data } = useAdminQuery<Settings>("settings");
  const form = useForm<Settings>();
  useEffect(() => { if (data) form.reset(data); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useAdminAction((v: Settings) => adminApi.patch("settings", { ...v, expenseCategories: typeof v.expenseCategories === "string" ? String(v.expenseCategories).split(",").map((s) => s.trim()) : v.expenseCategories }), { success: "Configuración guardada" });
  const num = { valueAsNumber: true };
  if (!data) return null;
  return (
    <>
      <PageHeader title="Configuración" actions={<Button loading={save.isPending} onClick={form.handleSubmit((v) => save.mutate(v))}>Guardar</Button>} />
      <div className={styles.twoCols}>
        <Card tone="light" title="Negocio y reservas">
          <div className={styles.formGrid}>
            <Input tone="light" label="Nombre" {...form.register("businessName")} />
            <Input tone="light" label="WhatsApp principal" {...form.register("whatsappMain")} hint="Formato internacional, solo números" />
            <Input tone="light" type="number" label="Minutos para pagar la seña" {...form.register("holdMinutes", num)} />
            <Input tone="light" type="number" label="Horas mínimas para cancelar sin perder la seña" {...form.register("cancellationHours", num)} />
            <Input tone="light" type="number" label="Intervalo de la agenda (min)" {...form.register("slotStepMinutes", num)} />
            <Input tone="light" type="number" label="Tope de deuda por cliente" {...form.register("clientCreditLimit", num)} />
            <Input tone="light" type="number" label="Crédito por referido" {...form.register("referralReward", num)} />
            <Input tone="light" type="number" label="% de descuento al referido" {...form.register("referredDiscountPct", num)} />
          </div>
        </Card>
        <Card tone="light" title="Equipo y caja">
          <div className={styles.formGrid}>
            <Input tone="light" type="number" label="Comisión por defecto (%)" {...form.register("defaultCommissionPct", num)} />
            <Input tone="light" type="number" label="Tope de adelanto (% del saldo)" {...form.register("advanceMaxPctOfBalance", num)} />
            <Input tone="light" type="number" label="Valor hora extra por defecto" {...form.register("overtimeHourRate", num)} />
            <Checkbox tone="light" label="Comisión sobre el precio con descuento" {...form.register("commissionOnNet")} />
            <Checkbox tone="light" className={styles.full} label="Cierre de caja ciego (el cajero no ve el esperado)" {...form.register("blindCashClose")} />
          </div>
          <h4>Medios de pago y sus comisiones</h4>
          {data.paymentMethods.map((m, i) => (
            <div key={m.key} className={styles.row}>
              <strong style={{ width: 120 }}>{m.label}</strong>
              <Input tone="light" type="number" step="0.01" aria-label={`Comisión ${m.label}`} {...form.register(`paymentMethods.${i}.feePct`, num)} />
              <span className={styles.small}>% por cobro</span>
            </div>
          ))}
        </Card>
        <Card tone="light" title="Niveles de cliente (no solo por gasto)">
          <DataTable rows={data.tiers} rowKey={(t) => t.key} columns={[
            { key: "l", header: "Nivel", render: (t) => t.label },
            { key: "c", header: "Se alcanza con (cualquiera)", render: (t) => [t.minVisits && `${t.minVisits} visitas`, t.minReferrals && `${t.minReferrals} referidos`, t.minDaysSinceFirstVisit && `${t.minDaysSinceFirstVisit} días de antigüedad`, t.withMembership && "membresía activa"].filter(Boolean).join(" · ") || "—" },
            { key: "d", header: "Beneficio", render: (t) => `${t.discountPct ?? 0}% en servicios` },
          ]} />
        </Card>
        <Card tone="light" title="Categorías de gastos">
          <Input tone="light" defaultValue={data.expenseCategories.join(", ")} {...form.register("expenseCategories")} hint="Separadas por comas" />
        </Card>
      </div>
    </>
  );
}

function LocationsSettings() {
  return (
    <ResourcePage<Location>
      title="Sedes"
      subtitle="WhatsApp que recibe las reservas, datos bancarios para la seña y horarios."
      resource="locations"
      singular="sede"
      canDelete={false}
      transform={(p) => ({ ...p, openingHours: undefined })}
      columns={[
        { key: "n", header: "Sede", render: (l) => <strong>{l.name}</strong> },
        { key: "a", header: "Dirección", render: (l) => l.address, hideOnMobile: true },
        { key: "w", header: "WhatsApp", render: (l) => `+${l.whatsapp}` },
        { key: "b", header: "Alias", render: (l) => l.bankAlias ?? "—", hideOnMobile: true },
        { key: "d", header: "Seña", align: "right", render: (l) => money(l.depositAmount) },
      ]}
      fields={[
        { name: "name", label: "Nombre", required: true },
        { name: "slug", label: "URL", required: true, placeholder: "palermo" },
        { name: "address", label: "Dirección", required: true, span: 2 },
        { name: "whatsapp", label: "WhatsApp (recibe reservas)", required: true, hint: "Ej: 5491155555555" },
        { name: "phone", label: "Teléfono" },
        { name: "bankAlias", label: "Alias para la seña" },
        { name: "bankCbu", label: "CBU / CVU" },
        { name: "bankHolder", label: "Titular de la cuenta" },
        { name: "depositAmount", label: "Monto de la seña", type: "money" },
        { name: "tagline", label: "Frase corta" },
        { name: "description", label: "Descripción", type: "textarea", span: 2 },
        { name: "features", label: "Características", type: "list" },
        { name: "heroImage", label: "Imagen principal (URL)" },
        { name: "isVip", label: "Tiene salón VIP", type: "checkbox" },
        { name: "active", label: "Activa", type: "checkbox" },
      ]}
    />
  );
}
