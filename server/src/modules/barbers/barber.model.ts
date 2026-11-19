import bcrypt from "bcryptjs";
import { Schema, model } from "mongoose";
import { AppError } from "../../lib/AppError.js";
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
    /** Galería de trabajos del barbero (URLs de imagen). */
    gallery: [String],
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
    /** Hash bcrypt del PIN de fichaje (6 a 8 dígitos). Nunca se guarda ni se devuelve en claro. */
    attendancePin: { type: String, select: false },
    pinFailed: { type: Number, default: 0, select: false },
    pinLockUntil: { type: Date, select: false },
    public: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/** Guarda el PIN siempre hasheado y rechaza que dos barberos tengan el mismo (así el PIN solo no identifica a nadie ambiguamente). */
barberSchema.pre("save", async function () {
  if (!this.isModified("attendancePin") || !this.attendancePin) return;
  const plain = this.attendancePin;
  if (/^\$2[aby]\$/.test(plain)) return; // ya es un hash
  if (!/^\d{6,8}$/.test(plain)) throw new AppError(400, "El PIN debe tener de 6 a 8 dígitos", "BAD_PIN");
  const others = await Barber.find({ _id: { $ne: this._id }, attendancePin: { $exists: true } }).select("+attendancePin").lean();
  for (const o of others) if (o.attendancePin && (await bcrypt.compare(plain, o.attendancePin))) throw new AppError(409, "Ese PIN ya lo usa otro barbero", "PIN_TAKEN");
  this.attendancePin = await bcrypt.hash(plain, 10);
});

export const Barber = model("Barber", barberSchema);
