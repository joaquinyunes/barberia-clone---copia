import { Schema, model } from "mongoose";
import { commissionSchema } from "../services/service.model.js";

export const BARBER_STATUSES = ["active", "inactive", "vacation", "leave", "suspended"] as const;
export const ABSENCE_TYPES = ["vacation", "day_off", "leave", "other"] as const;

const scheduleDaySchema = new Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    start: String, // "09:00"
    end: String,
    off: { type: Boolean, default: false },
    breaks: [{ start: String, end: String, label: String, _id: false }],
  },
  { _id: false },
);

const barberSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    phone: String,
    email: String,
    dni: String,
    birthday: Date,
    hiredAt: { type: Date, default: Date.now },
    status: { type: String, enum: BARBER_STATUSES, default: "active" },
    location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    station: { type: Schema.Types.ObjectId, ref: "Station" },
    photo: String,
    bio: String,
    specialties: [String],
    instagram: String,
    /** Servicios que puede hacer. Vacío = todos. */
    services: [{ type: Schema.Types.ObjectId, ref: "Service" }],
    schedule: [scheduleDaySchema],
    absences: [{ from: Date, to: Date, type: { type: String, enum: ABSENCE_TYPES }, note: String }],
    /** % por defecto y por categoría (corte 50 %, barba 40 %...). */
    defaultCommissionPct: Number,
    commissionByCategory: { type: Map, of: Number, default: {} },
    /** Excepción puntual por servicio (tiene prioridad sobre todo). */
    commissionOverrides: [{ service: { type: Schema.Types.ObjectId, ref: "Service" }, commission: commissionSchema, _id: false }],
    hourlyRate: Number, // para horas extra
    monthlyHours: { type: Number, default: 160 },
    attendancePin: { type: String, select: false },
    public: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Barber = model("Barber", barberSchema);
