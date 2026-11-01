import { Schema, model } from "mongoose";

/** waiting: espera un hueco · offered: se le reservó un horario · booked: lo tomó · expired: no llegó a tiempo · cancelled: lo sacó el admin */
export const WAITLIST_STATUSES = ["waiting", "offered", "booked", "expired", "cancelled"] as const;

const waitlistSchema = new Schema(
  {
    location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    service: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    barber: { type: Schema.Types.ObjectId, ref: "Barber" }, // vacío = cualquiera
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD, día del negocio
    status: { type: String, enum: WAITLIST_STATUSES, default: "waiting" },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment" }, // el turno que se le ofreció
    offeredAt: Date,
  },
  { timestamps: true },
);
waitlistSchema.index({ location: 1, date: 1, status: 1, createdAt: 1 });
waitlistSchema.index({ appointment: 1 });

export const WaitlistEntry = model("WaitlistEntry", waitlistSchema);
