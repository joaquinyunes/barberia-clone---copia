export const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Esperando seña",
  payment_review: "Revisar comprobante",
  confirmed: "Confirmado",
  in_progress: "En curso",
  completed: "Realizado",
  cancelled: "Cancelado",
  no_show: "No vino",
};
export const STATUS_TONE: Record<string, "neutral" | "warning" | "info" | "success" | "danger" | "gold"> = {
  pending_payment: "warning",
  payment_review: "gold",
  confirmed: "info",
  in_progress: "info",
  completed: "success",
  cancelled: "neutral",
  no_show: "danger",
};
export const CANCEL_BY_LABELS: Record<string, string> = {
  client: "Canceló el cliente",
  business: "Canceló la barbería",
  no_show: "No-show",
  system: "Seña vencida",
  rescheduled: "Reprogramado",
};
export const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  mercadopago: "Mercado Pago",
  card: "Tarjeta",
  balance: "Saldo a favor",
  giftcard: "Gift card",
  pack: "Pack / bono",
  membership: "Membresía",
};
export const BARBER_STATUS: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  vacation: "Vacaciones",
  leave: "Licencia",
  suspended: "Suspendido",
};
export const CATEGORY_LABELS: Record<string, string> = {
  corte: "Cortes",
  barba: "Barba y afeitado",
  combo: "Combos",
  color: "Color",
  tratamiento: "Tratamientos",
  vip: "Salón VIP La Cava",
};
export const MOVEMENT_LABELS: Record<string, string> = {
  commission: "Comisión",
  tip: "Propina",
  bonus: "Bono",
  overtime: "Horas extra",
  advance: "Adelanto",
  debt_installment: "Cuota",
  consumption: "Consumo",
  discount: "Descuento",
  settlement_payment: "Pago liquidación",
  service_charge: "Servicio",
  product_charge: "Producto",
  payment: "Pago",
  deposit: "Seña",
  credit: "Crédito",
  referral_credit: "Referido",
  refund: "Devolución",
  purchase: "Compra",
  supplier_payment: "Pago proveedor",
  adjustment: "Ajuste",
  reversal: "Anulación",
};
export const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
