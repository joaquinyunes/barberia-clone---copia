import { Schema, model } from "mongoose";
import { TENDER_TYPES } from "../settings/settings.model.js";

export const APPOINTMENT_STATUSES = [
  "pending_payment", // reservado, esperando la seña (con vencimiento)
  "payment_review", // subió comprobante, falta que el admin lo apruebe
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;
/** Estados que ocupan el horario del barbero. */
export const BLOCKING_STATUSES = ["pending_payment", "payment_review", "confirmed", "in_progress"] as const;

export const CANCEL_BY = ["client", "business", "system", "no_show", "rescheduled"] as const;

const depositSchema = new Schema(
  {
    required: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    method: String,
    receiptPath: String,
    receiptMime: String,
    uploadedAt: Date,
    approvedAt: Date,
    approvedBy: String,
    rejectedReason: String,
    mpPaymentId: String,
  },
  { _id: false },
);

const appointmentSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    barber: { type: Schema.Types.ObjectId, ref: "Barber", required: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: "pending_payment" },
    source: { type: String, enum: ["web", "admin", "walkin", "whatsapp"], default: "web" },
    serviceName: String,
    price: { type: Number, required: true }, // precio de lista al momento de reservar
    discount: { type: Number, default: 0 },
    discountReason: String,
    promo: { code: String, id: { type: Schema.Types.ObjectId, ref: "Promotion" } },
    total: { type: Number, required: true }, // precio - descuento
    deposit: { type: depositSchema, default: () => ({}), required: true },
    paidAmount: { type: Number, default: 0 }, // todo lo cobrado (seña + resto)
    /** Parte cubierta por membresía/pack (ya se contó como ingreso al venderlos). */
    prepaidCovered: { type: Number, default: 0 },
    commission: Number,
    commissionRule: String,
    tip: { type: Number, default: 0 },
    products: [{ product: { type: Schema.Types.ObjectId, ref: "Product" }, name: String, qty: Number, unitPrice: Number, _id: false }],
    payments: [{ tender: { type: String, enum: TENDER_TYPES }, amount: Number, at: Date, ref: String, _id: false }],
    holdExpiresAt: Date,
    notes: String,
    cancellation: {
      by: { type: String, enum: CANCEL_BY },
      reason: String,
      at: Date,
      noticeHours: Number,
      depositRetained: Boolean,
    },
    rescheduledFrom: { type: Schema.Types.ObjectId, ref: "Appointment" },
    whatsappSentAt: Date,
    completedAt: Date,
    reminderSentAt: Date,
    createdBy: String,
  },
  { timestamps: true },
);
appointmentSchema.index({ barber: 1, startsAt: 1 });
appointmentSchema.index({ location: 1, startsAt: 1 });
appointmentSchema.index({ client: 1, startsAt: -1 });
appointmentSchema.index({ status: 1, holdExpiresAt: 1 });
// Anti doble reserva: un barbero no puede tener dos turnos activos que empiecen a la misma hora.
appointmentSchema.index(
  { barber: 1, startsAt: 1 },
  { unique: true, partialFilterExpression: { status: { $in: [...BLOCKING_STATUSES] } }, name: "uniq_active_slot" },
);

appointmentSchema.virtual("pendingAmount").get(function () {
  return Math.max(0, this.total + (this.tip ?? 0) - this.paidAmount);
});
appointmentSchema.set("toJSON", { virtuals: true });
appointmentSchema.set("toObject", { virtuals: true });

export const Appointment = model("Appointment", appointmentSchema);
