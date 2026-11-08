import { Schema, model } from "mongoose";

/** Un documento por pago de Mercado Pago ya recibido: el índice único es lo que hace idempotente al webhook. */
const paymentEventSchema = new Schema(
  {
    paymentId: { type: String, required: true, unique: true },
    outcome: { type: String, enum: ["processing", "confirmed", "ignored", "needs_review"], default: "processing" },
    detail: String,
  },
  { timestamps: true },
);

export const PaymentEvent = model("PaymentEvent", paymentEventSchema);
