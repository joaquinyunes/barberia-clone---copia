import { Schema, model } from "mongoose";

const contactSchema = new Schema(
  {
    name: String,
    email: String,
    phone: String,
    location: { type: Schema.Types.ObjectId, ref: "Location" },
    message: String,
    handled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const ContactMessage = model("ContactMessage", contactSchema);
