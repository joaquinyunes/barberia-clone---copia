import { Schema, model } from "mongoose";

/**
 * "Banco interno": cada cliente, barbero y proveedor tiene UNA cuenta.
 *
 * Convención única de signo:  saldo > 0  → la barbería le DEBE a esa persona
 *                             saldo < 0  → esa persona le DEBE a la barbería
 *
 *  - Barbero: comisión (+), adelanto (−), cuota de deuda (−), pago de liquidación (−)
 *  - Cliente: seña/pago (+), servicio realizado (−), crédito/gift/referido (+)
 *  - Proveedor: compra (+), pago al proveedor (−)
 *
 * Los movimientos son inmutables: para corregir se crea un contra-asiento (reverse).
 */
export const OWNER_TYPES = ["client", "barber", "supplier"] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];

export const MOVEMENT_TYPES = {
  // barbero
  commission: "Comisión",
  tip: "Propina",
  bonus: "Bono / premio",
  overtime: "Horas extra",
  advance: "Adelanto",
  debt_installment: "Cuota de deuda",
  consumption: "Consumo de productos",
  discount: "Descuento",
  settlement_payment: "Pago de liquidación",
  // cliente
  service_charge: "Servicio",
  product_charge: "Producto",
  payment: "Pago",
  deposit: "Seña",
  credit: "Crédito a favor",
  referral_credit: "Crédito por referido",
  refund: "Devolución",
  // proveedor
  purchase: "Compra",
  supplier_payment: "Pago a proveedor",
  // común
  adjustment: "Ajuste",
  reversal: "Anulación",
} as const;
export type MovementType = keyof typeof MOVEMENT_TYPES;

const accountSchema = new Schema(
  {
    ownerType: { type: String, enum: OWNER_TYPES, required: true },
    owner: { type: Schema.Types.ObjectId, required: true, refPath: "ownerModel" },
    ownerModel: { type: String, enum: ["Client", "Barber", "Supplier"], required: true },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true },
);
accountSchema.index({ ownerType: 1, owner: 1 }, { unique: true });

const movementSchema = new Schema(
  {
    account: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    ownerType: { type: String, enum: OWNER_TYPES, required: true },
    owner: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: Object.keys(MOVEMENT_TYPES), required: true },
    amount: { type: Number, required: true }, // con signo
    balanceAfter: { type: Number, required: true },
    concept: { type: String, required: true },
    date: { type: Date, default: Date.now },
    location: { type: Schema.Types.ObjectId, ref: "Location" },
    ref: { kind: String, id: Schema.Types.ObjectId },
    method: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdByName: String,
    reversed: { type: Boolean, default: false },
    reversalOf: { type: Schema.Types.ObjectId, ref: "Movement" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
movementSchema.index({ owner: 1, date: -1 });
movementSchema.index({ ownerType: 1, type: 1, date: -1 });
movementSchema.index({ "ref.kind": 1, "ref.id": 1 });

export const Account = model("Account", accountSchema);
export const Movement = model("Movement", movementSchema);
