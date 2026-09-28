import { Schema, model } from "mongoose";

const stationSchema = new Schema(
  {
    name: { type: String, required: true }, // "Puesto 1"
    location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    status: { type: String, enum: ["available", "occupied", "maintenance", "out_of_service"], default: "available" },
    barber: { type: Schema.Types.ObjectId, ref: "Barber" },
    lastCleaningAt: Date,
    cleaningLog: [{ at: Date, by: String, _id: false }],
    notes: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Station = model("Station", stationSchema);
