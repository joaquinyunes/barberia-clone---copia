import { formatDateAR, businessTimeString, weekdayName } from "../dates.js";
import { formatARS } from "../money.js";

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  mercadopago: "Mercado Pago",
  card: "Tarjeta",
};

export interface BookingMessageData {
  businessName: string;
  code: string;
  client: { name: string; phone: string; email?: string | null };
  location: { name: string; address: string };
  service: { name: string; durationMin: number };
  barber: { name: string };
  startsAt: Date;
  total: number;
  discount?: number;
  promoCode?: string | null;
  deposit: { required: number; paid: number; method?: string | null };
  receiptUrl?: string | null;
  mpPaymentId?: string | null;
  notes?: string | null;
  adminUrl?: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Mensaje que llega al WhatsApp de la sede con TODOS los datos del turno. */
export function buildBookingMessage(d: BookingMessageData) {
  const pending = Math.max(0, d.total - d.deposit.paid);
  const lines = [
    `✂️ *NUEVA RESERVA – ${d.businessName}*`,
    `Código: *${d.code}*`,
    "",
    `👤 Cliente: ${d.client.name}`,
    `📞 Teléfono: +${d.client.phone}`,
    d.client.email ? `📧 Email: ${d.client.email}` : null,
    "",
    `📍 Sede: ${d.location.name} – ${d.location.address}`,
    `💈 Servicio: ${d.service.name} (${d.service.durationMin} min)`,
    `🧔 Barbero: ${d.barber.name}`,
    `📅 Fecha: ${cap(weekdayName(d.startsAt))} ${formatDateAR(d.startsAt)} – ${businessTimeString(d.startsAt)} h`,
    "",
    `💵 Total: ${formatARS(d.total)}${d.discount ? ` (descuento ${formatARS(d.discount)}${d.promoCode ? ` con ${d.promoCode}` : ""})` : ""}`,
    d.deposit.required
      ? `✅ Seña: ${formatARS(d.deposit.paid || d.deposit.required)} – ${METHOD_LABELS[d.deposit.method ?? "transfer"] ?? d.deposit.method}`
      : null,
    `🕐 Resta abonar en el local: ${formatARS(pending || d.total - d.deposit.required)}`,
    d.mpPaymentId ? `🧾 Operación Mercado Pago: ${d.mpPaymentId}` : null,
    d.receiptUrl ? `🧾 Comprobante: ${d.receiptUrl}` : null,
    d.notes ? `📝 Nota: "${d.notes}"` : null,
    d.adminUrl ? "" : null,
    d.adminUrl ? `Confirmar / rechazar: ${d.adminUrl}` : null,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

export interface OrderMessageData {
  businessName: string;
  code: string;
  client: { name: string; phone: string; email?: string | null };
  items: { name: string; qty: number; unitPrice: number }[];
  total: number;
  recipient?: { name?: string | null; phone?: string | null } | null;
  method?: string | null;
  receiptUrl?: string | null;
  location?: { name: string } | null;
  notes?: string | null;
  adminUrl?: string;
}

export function buildOrderMessage(d: OrderMessageData) {
  const lines = [
    `🛍️ *NUEVO PEDIDO – ${d.businessName}*`,
    `Código: *${d.code}*`,
    "",
    `👤 Cliente: ${d.client.name}`,
    `📞 Teléfono: +${d.client.phone}`,
    d.client.email ? `📧 Email: ${d.client.email}` : null,
    d.location ? `📍 Retira / canjea en: ${d.location.name}` : null,
    "",
    "*Detalle:*",
    ...d.items.map((i) => `• ${i.qty} × ${i.name} – ${formatARS(i.unitPrice * i.qty)}`),
    "",
    `💵 Total: ${formatARS(d.total)} – ${METHOD_LABELS[d.method ?? "transfer"] ?? d.method}`,
    d.recipient?.name ? `🎁 Para: ${d.recipient.name}${d.recipient.phone ? ` (+${d.recipient.phone})` : ""}` : null,
    d.receiptUrl ? `🧾 Comprobante: ${d.receiptUrl}` : null,
    d.notes ? `📝 Nota: "${d.notes}"` : null,
    d.adminUrl ? "" : null,
    d.adminUrl ? `Aprobar pedido: ${d.adminUrl}` : null,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

/** Recibo de liquidación para enviarle al barbero por WhatsApp. */
export function buildSettlementMessage(d: { businessName: string; barber: string; label: string; lines: { label: string; amount: number }[]; payout: number; method: string }) {
  return [
    `💈 *Liquidación ${d.label} – ${d.businessName}*`,
    `Barbero: ${d.barber}`,
    "",
    ...d.lines.map((l) => `${l.label}: ${l.amount < 0 ? "-" : ""}${formatARS(Math.abs(l.amount))}`),
    "",
    `*TOTAL PAGADO: ${formatARS(d.payout)}* (${METHOD_LABELS[d.method] ?? d.method})`,
    "",
    "Podés revisarla y confirmarla desde tu panel.",
  ].join("\n");
}
