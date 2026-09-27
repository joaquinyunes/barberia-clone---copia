import { Schema, model } from "mongoose";

const hoursSchema = new Schema(
  { day: { type: Number, min: 0, max: 6 }, open: String, close: String, closed: { type: Boolean, default: false } },
  { _id: false },
);

const locationSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    tagline: String,
    address: { type: String, required: true },
    neighborhood: String,
    city: { type: String, default: "Buenos Aires" },
    geo: { lat: Number, lng: Number },
    phone: String,
    whatsapp: { type: String, required: true }, // formato internacional sin "+": 5491155555555
    email: String,
    description: String,
    features: [String],
    images: [String],
    heroImage: String,
    openingHours: [hoursSchema],
    bankAlias: String,
    bankCbu: String,
    bankHolder: String,
    depositAmount: { type: Number, default: 5000 },
    isVip: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Location = model("Location", locationSchema);
