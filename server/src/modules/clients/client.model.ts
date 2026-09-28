import { Schema, model } from "mongoose";

const clientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true }, // solo dígitos
    email: { type: String, lowercase: true, trim: true },
    dni: String,
    birthday: Date,
    user: { type: Schema.Types.ObjectId, ref: "User" },
    tier: { type: String, default: "normal" },
    visits: { type: Number, default: 0 },
    firstVisitAt: Date,
    lastVisitAt: Date,
    /** Frecuencia promedio entre visitas, en días (para "ya te toca" y clientes en riesgo). */
    avgFrequencyDays: Number,
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "Client" },
    referralRewarded: { type: Boolean, default: false },
    source: { type: String, default: "web" }, // web | walkin | instagram | referido | admin
    preferredBarber: { type: Schema.Types.ObjectId, ref: "Barber" },
    creditLimit: Number, // tope de deuda; vacío = el de configuración
    tags: [String],
    internalNotes: [{ text: String, by: String, at: { type: Date, default: Date.now } }],
    cutNotes: [
      {
        date: { type: Date, default: Date.now },
        barber: { type: Schema.Types.ObjectId, ref: "Barber" },
        text: String,
        photos: [String],
        appointment: { type: Schema.Types.ObjectId, ref: "Appointment" },
      },
    ],
    blocked: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
clientSchema.index({ name: "text" });

export const Client = model("Client", clientSchema);

export const normalizePhone = (phone: string) => {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("54")) digits = `549${digits}`;
  return digits;
};
