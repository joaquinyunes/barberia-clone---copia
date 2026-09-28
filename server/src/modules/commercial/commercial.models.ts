import { Schema, model } from "mongoose";

/** Un "beneficio" consumible: por servicio puntual o por categoría (ej. 4 cortes, 2 barbas). */
const allowanceSchema = new Schema(
  { service: { type: Schema.Types.ObjectId, ref: "Service" }, category: String, label: String, quantity: Number },
  { _id: false },
);
const usageSchema = new Schema(
  { key: String, label: String, total: Number, used: { type: Number, default: 0 } },
  { _id: false },
);

const giftCardSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    initialValue: { type: Number, required: true },
    balance: { type: Number, required: true },
    status: { type: String, enum: ["active", "used", "expired", "void"], default: "active" },
    expiresAt: Date,
    buyer: { type: Schema.Types.ObjectId, ref: "Client" },
    recipientName: String,
    recipientPhone: String,
    message: String,
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    redemptions: [{ amount: Number, date: Date, ref: String, _id: false }],
    issuedBy: String,
  },
  { timestamps: true },
);

const packPlanSchema = new Schema(
  {
    name: { type: String, required: true }, // "Pack 10 cortes", "Padre e hijo"
    description: String,
    items: [allowanceSchema],
    price: { type: Number, required: true },
    validityDays: { type: Number, default: 180 },
    shop: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const clientPackSchema = new Schema(
  {
    code: { type: String, required: true, unique: true }, // BONO-48392
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    plan: { type: Schema.Types.ObjectId, ref: "PackPlan" },
    name: String,
    usage: [usageSchema],
    pricePaid: Number,
    expiresAt: Date,
    status: { type: String, enum: ["active", "used", "expired", "void"], default: "active" },
    history: [{ date: Date, label: String, appointment: Schema.Types.ObjectId, _id: false }],
    issuedBy: String,
  },
  { timestamps: true },
);

const membershipPlanSchema = new Schema(
  {
    name: { type: String, required: true }, // "Club Jack"
    description: String,
    price: { type: Number, required: true },
    items: [allowanceSchema],
    productDiscountPct: { type: Number, default: 0 },
    serviceDiscountPct: { type: Number, default: 0 }, // sobre servicios fuera del cupo
    priorityBooking: { type: Boolean, default: false },
    /** Congela el precio de los servicios incluidos aunque haya aumentos. */
    priceLock: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const membershipSchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    plan: { type: Schema.Types.ObjectId, ref: "MembershipPlan", required: true },
    status: { type: String, enum: ["active", "paused", "cancelled", "expired"], default: "active" },
    startedAt: { type: Date, default: Date.now },
    periodStart: Date,
    renewsAt: Date,
    usage: [usageSchema],
    payments: [{ date: Date, amount: Number, method: String, _id: false }],
    mpPreapprovalId: String,
  },
  { timestamps: true },
);
membershipSchema.index({ client: 1, status: 1 });

const promotionSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, uppercase: true, sparse: true, unique: true }, // vacío = automática
    description: String,
    type: { type: String, enum: ["percent", "fixed", "fixed_price"], required: true },
    value: { type: Number, required: true },
    services: [{ type: Schema.Types.ObjectId, ref: "Service" }], // vacío = todos
    days: [Number], // 0-6; vacío = todos
    timeFrom: String,
    timeTo: String,
    minAmount: Number,
    maxUses: Number,
    maxUsesPerClient: Number,
    uses: { type: Number, default: 0 },
    validFrom: Date,
    validTo: Date,
    newClientsOnly: { type: Boolean, default: false },
    /** "Happy hour": se aplica sola en los horarios configurados, sin código. */
    automatic: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const GiftCard = model("GiftCard", giftCardSchema);
export const PackPlan = model("PackPlan", packPlanSchema);
export const ClientPack = model("ClientPack", clientPackSchema);
export const MembershipPlan = model("MembershipPlan", membershipPlanSchema);
export const Membership = model("Membership", membershipSchema);
export const Promotion = model("Promotion", promotionSchema);
