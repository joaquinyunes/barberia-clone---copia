import { Schema, model } from "mongoose";

export const DEBT_CATEGORIES = {
  loan: "Préstamo",
  product: "Producto comprado",
  tool: "Herramienta",
  cash_shortage: "Faltante de caja",
  advance: "Adelanto en cuotas",
  other: "Otro",
} as const;

const debtSchema = new Schema(
  {
    barber: { type: Schema.Types.ObjectId, ref: "Barber", required: true },
    category: { type: String, enum: Object.keys(DEBT_CATEGORIES), required: true },
    concept: { type: String, required: true },
    total: { type: Number, required: true, min: 1 },
    date: { type: Date, default: Date.now },
    installments: [
      {
        number: Number,
        amount: Number,
        dueDate: Date,
        status: { type: String, enum: ["pending", "applied", "cancelled"], default: "pending" },
        appliedAt: Date,
        movement: { type: Schema.Types.ObjectId, ref: "Movement" },
      },
    ],
    disbursed: { type: Boolean, default: false }, // se entregó dinero (sale de caja)
    method: String,
    location: { type: Schema.Types.ObjectId, ref: "Location" },
    tool: { type: Schema.Types.ObjectId, ref: "Tool" },
    status: { type: String, enum: ["active", "paid", "cancelled"], default: "active" },
    createdBy: String,
  },
  { timestamps: true },
);

debtSchema.virtual("remaining").get(function () {
  return this.installments.filter((i) => i.status === "pending").reduce((a, i) => a + (i.amount ?? 0), 0);
});
debtSchema.set("toJSON", { virtuals: true });
debtSchema.set("toObject", { virtuals: true });

const settlementSchema = new Schema(
  {
    barber: { type: Schema.Types.ObjectId, ref: "Barber", required: true },
    label: String, // "Septiembre 2026"
    from: Date,
    to: Date,
    servicesCount: Number,
    salesTotal: Number,
    totals: {
      commissions: Number,
      tips: Number,
      bonus: Number,
      overtime: Number,
      advances: Number,
      installments: Number,
      consumption: Number,
      discounts: Number,
      other: Number,
    },
    lines: [{ label: String, amount: Number, _id: false }],
    balanceBefore: Number,
    payout: Number,
    carriedOver: Number, // saldo negativo que pasa al próximo período
    method: String,
    status: { type: String, enum: ["paid", "carried"], default: "paid" },
    paidAt: Date,
    closedBy: String,
    acceptedAt: Date, // el barbero confirma su liquidación desde su panel
    disputeNote: String,
  },
  { timestamps: true },
);

const goalSchema = new Schema(
  {
    barber: { type: Schema.Types.ObjectId, ref: "Barber", required: true },
    period: { type: String, required: true }, // YYYY-MM
    targets: [
      {
        metric: { type: String, enum: ["revenue", "services", "haircuts", "beards", "products", "new_clients"] },
        target: Number,
        _id: false,
      },
    ],
    /** Escalones: superar el 100 % da el bono; se pueden sumar escalones extra (ej. 120 % → +$20.000). */
    bonus: { type: { type: String, enum: ["fixed", "percent"], default: "fixed" }, value: Number },
    tiers: [{ pct: Number, bonus: Number, _id: false }],
    bonusApplied: { type: Boolean, default: false },
    notes: String,
  },
  { timestamps: true },
);
goalSchema.index({ barber: 1, period: 1 }, { unique: true });

const attendanceSchema = new Schema(
  {
    barber: { type: Schema.Types.ObjectId, ref: "Barber", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    checkIn: Date,
    checkOut: Date,
    scheduledStart: String,
    scheduledMinutes: { type: Number, default: 0 },
    workedMinutes: { type: Number, default: 0 },
    lateMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    status: { type: String, enum: ["present", "absent", "justified", "day_off"], default: "present" },
    note: String,
    settled: { type: Boolean, default: false }, // horas extra ya liquidadas
  },
  { timestamps: true },
);
attendanceSchema.index({ barber: 1, date: 1 }, { unique: true });

export const Debt = model("Debt", debtSchema);
export const Settlement = model("Settlement", settlementSchema);
export const Goal = model("Goal", goalSchema);
export const Attendance = model("Attendance", attendanceSchema);
