import { Schema, model } from "mongoose";

/** Reseña verificada: solo existe si el cliente tuvo ese turno (completado) y tiene el link de la reserva. */
const reviewSchema = new Schema(
  {
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", required: true, unique: true },
    barber: { type: Schema.Types.ObjectId, ref: "Barber", required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    /** Encuesta: «¿qué tan probable es que nos recomiendes?» de 0 a 10 (NPS). */
    recommend: { type: Number, min: 0, max: 10 },
    comment: { type: String, maxlength: 500, trim: true },
    status: { type: String, enum: ["published", "hidden"], default: "published" },
  },
  { timestamps: true },
);
reviewSchema.index({ status: 1, createdAt: -1 });

export const Review = model("Review", reviewSchema);
