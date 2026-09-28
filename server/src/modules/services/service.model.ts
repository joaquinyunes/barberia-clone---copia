import { Schema, model } from "mongoose";

export const SERVICE_CATEGORIES = ["corte", "barba", "combo", "color", "tratamiento", "vip"] as const;
export const COMMISSION_TYPES = ["percent", "fixed"] as const;

export const commissionSchema = new Schema(
  { type: { type: String, enum: COMMISSION_TYPES }, value: Number },
  { _id: false },
);

const serviceSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, enum: SERVICE_CATEGORIES, required: true },
    description: String,
    includes: [String],
    durationMin: { type: Number, required: true, min: 5 },
    price: { type: Number, required: true, min: 0 },
    /** Costo de insumos estimado por servicio (cuchilla, toalla, productos) → margen real. */
    supplyCost: { type: Number, default: 0 },
    /** Comisión propia del servicio (ej. Fade: $7.000 fijo). Si no hay, se usa la del barbero. */
    commission: { type: commissionSchema, default: undefined },
    priceHistory: [{ price: Number, from: Date, changedBy: String, _id: false }],
    locations: [{ type: Schema.Types.ObjectId, ref: "Location" }], // vacío = todas
    image: String,
    featured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Historial de precios: cada cambio de precio agrega una entrada (nunca se pisa).
serviceSchema.pre("save", function () {
  if (!this.isNew && this.isModified("price")) {
    this.priceHistory.push({ price: this.price, from: new Date(), changedBy: this.$locals.changedBy as string });
  }
});

export const Service = model("Service", serviceSchema);
