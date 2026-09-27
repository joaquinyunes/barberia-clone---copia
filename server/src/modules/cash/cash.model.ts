import { Schema, model } from "mongoose";
import { PAYMENT_METHODS } from "../settings/settings.model.js";

export const CASH_CATEGORIES = {
  sale: "Venta de servicio",
  product_sale: "Venta de producto",
  deposit: "Seña",
  debt_payment: "Cobro de deuda",
  membership: "Membresía",
  pack: "Pack / bono",
  giftcard_sale: "Venta de gift card",
  tip: "Propina",
  advance: "Adelanto a barbero",
  loan: "Préstamo a barbero",
  settlement: "Pago de liquidación",
  expense: "Gasto",
  supplier_payment: "Pago a proveedor",
  refund: "Devolución",
  deposit_in: "Ingreso de efectivo",
  withdrawal: "Retiro de efectivo",
  other: "Otro",
} as const;
export type CashCategory = keyof typeof CASH_CATEGORIES;

const amountsByMethod = Object.fromEntries(PAYMENT_METHODS.map((m) => [m, { type: Number, default: 0 }]));

const sessionSchema = new Schema(
  {
    location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    openedAt: { type: Date, default: Date.now },
    openedBy: String,
    openingAmount: { type: Number, default: 0 }, // efectivo inicial
    closedAt: Date,
    closedBy: String,
    expected: amountsByMethod, // calculado al cerrar
    counted: amountsByMethod, // lo que contó el cajero (cierre ciego)
    difference: amountsByMethod,
    denominations: { type: Map, of: Number }, // arqueo: {"10000": 3, "2000": 5}
    fees: { type: Number, default: 0 },
    summary: Schema.Types.Mixed, // foto del cierre diario
    notes: String,
  },
  { timestamps: true },
);
sessionSchema.index({ location: 1, status: 1 });

const cashMovementSchema = new Schema(
  {
    session: { type: Schema.Types.ObjectId, ref: "CashSession" },
    location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    direction: { type: String, enum: ["in", "out"], required: true },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    amount: { type: Number, required: true, min: 0 },
    fee: { type: Number, default: 0 }, // comisión del medio de pago
    category: { type: String, enum: Object.keys(CASH_CATEGORIES), required: true },
    concept: String,
    party: { kind: String, id: Schema.Types.ObjectId, name: String },
    ref: { kind: String, id: Schema.Types.ObjectId },
    date: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdByName: String,
    voided: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
cashMovementSchema.index({ location: 1, date: -1 });
cashMovementSchema.index({ session: 1 });

export const CashSession = model("CashSession", sessionSchema);
export const CashMovement = model("CashMovement", cashMovementSchema);
