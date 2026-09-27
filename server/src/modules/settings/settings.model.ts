import { Schema, model } from "mongoose";

export const PAYMENT_METHODS = ["cash", "transfer", "mercadopago", "card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
/** Medios que no mueven dinero real: consumen saldo, gift card, pack o membresía. */
export const TENDER_TYPES = [...PAYMENT_METHODS, "balance", "giftcard", "pack", "membership"] as const;
export type Tender = (typeof TENDER_TYPES)[number];

const settingsSchema = new Schema(
  {
    key: { type: String, default: "main", unique: true },
    businessName: { type: String, default: "Jack el Barbero" },
    whatsappMain: { type: String, default: "5491100000000" },
    paymentMethods: {
      type: [
        {
          key: { type: String, enum: PAYMENT_METHODS },
          label: String,
          feePct: { type: Number, default: 0 },
          active: { type: Boolean, default: true },
        },
      ],
      default: [
        { key: "cash", label: "Efectivo", feePct: 0 },
        { key: "transfer", label: "Transferencia", feePct: 0 },
        { key: "mercadopago", label: "Mercado Pago", feePct: 6.29 },
        { key: "card", label: "Tarjeta", feePct: 3.5 },
      ],
    },
    defaultCommissionPct: { type: Number, default: 50 },
    commissionOnNet: { type: Boolean, default: true },
    advanceMaxPctOfBalance: { type: Number, default: 80 },
    holdMinutes: { type: Number, default: 30 },
    cancellationHours: { type: Number, default: 12 },
    slotStepMinutes: { type: Number, default: 15 },
    clientCreditLimit: { type: Number, default: 20000 },
    referralReward: { type: Number, default: 5000 },
    referredDiscountPct: { type: Number, default: 10 },
    overtimeHourRate: { type: Number, default: 5000 },
    blindCashClose: { type: Boolean, default: true },
    tiers: {
      type: [
        {
          key: String,
          label: String,
          minVisits: Number,
          minReferrals: Number,
          minDaysSinceFirstVisit: Number,
          withMembership: Boolean,
          discountPct: Number,
          benefits: String,
        },
      ],
      default: [
        { key: "normal", label: "Normal", minVisits: 0, discountPct: 0, benefits: "" },
        { key: "frecuente", label: "Frecuente", minVisits: 5, minReferrals: 2, discountPct: 5, benefits: "5% en servicios" },
        {
          key: "premium",
          label: "Premium",
          minVisits: 15,
          minDaysSinceFirstVisit: 365,
          withMembership: true,
          discountPct: 10,
          benefits: "10% en servicios y prioridad en la agenda",
        },
      ],
    },
    expenseCategories: {
      type: [String],
      default: ["Alquiler", "Servicios", "Internet", "Productos", "Herramientas", "Sueldos", "Publicidad", "Mantenimiento", "Impuestos", "Otros"],
    },
  },
  { timestamps: true },
);

export const Settings = model("Settings", settingsSchema);

export async function getSettings() {
  return (await Settings.findOne({ key: "main" })) ?? (await Settings.create({ key: "main" }));
}

export async function paymentFee(method: string, amount: number) {
  const s = await getSettings();
  const m = s.paymentMethods.find((p) => p.key === method);
  return Math.round((amount * (m?.feePct ?? 0)) / 100);
}
