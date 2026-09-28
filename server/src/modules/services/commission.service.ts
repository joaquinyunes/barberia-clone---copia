import { getSettings } from "../settings/settings.model.js";

interface CommissionRule {
  type?: string | null;
  value?: number | null;
}
interface BarberLike {
  defaultCommissionPct?: number | null;
  commissionByCategory?: Map<string, number> | Record<string, number> | null;
  commissionOverrides?: { service?: unknown; commission?: CommissionRule | null }[];
}
interface ServiceLike {
  _id: unknown;
  category: string;
  commission?: CommissionRule | null;
}

const apply = (rule: CommissionRule, base: number) =>
  rule.type === "fixed" ? Math.min(rule.value ?? 0, base) : Math.round((base * (rule.value ?? 0)) / 100);

/**
 * Prioridad de reglas (la primera que exista gana):
 *  1. Excepción del barbero para ese servicio   (Lucas + Fade = $8.000)
 *  2. Comisión propia del servicio               (Fade = $7.000 fijo)
 *  3. % del barbero para la categoría            (Lucas: barba 40 %)
 *  4. % general del barbero                      (Lucas: 50 %)
 *  5. % por defecto de la barbería               (configuración)
 */
export async function computeCommission(barber: BarberLike, service: ServiceLike, base: number) {
  const override = barber.commissionOverrides?.find((o) => String(o.service) === String(service._id));
  if (override?.commission?.type) {
    return { amount: apply(override.commission, base), rule: "barbero-servicio" };
  }
  if (service.commission?.type) return { amount: apply(service.commission, base), rule: "servicio" };
  const byCat =
    barber.commissionByCategory instanceof Map
      ? barber.commissionByCategory.get(service.category)
      : barber.commissionByCategory?.[service.category];
  if (typeof byCat === "number") return { amount: apply({ type: "percent", value: byCat }, base), rule: "categoria" };
  if (typeof barber.defaultCommissionPct === "number") {
    return { amount: apply({ type: "percent", value: barber.defaultCommissionPct }, base), rule: "barbero" };
  }
  const settings = await getSettings();
  return { amount: apply({ type: "percent", value: settings.defaultCommissionPct }, base), rule: "general" };
}
