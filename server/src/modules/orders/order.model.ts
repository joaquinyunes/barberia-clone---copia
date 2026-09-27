import { Schema, model } from "mongoose";

const orderSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    items: [
      {
        kind: { type: String, enum: ["product", "pack"], required: true },
        product: { type: Schema.Types.ObjectId, ref: "Product" },
        packPlan: { type: Schema.Types.ObjectId, ref: "PackPlan" },
        name: String,
        qty: Number,
        unitPrice: Number,
        _id: false,
      },
    ],
    total: { type: Number, required: true },
    status: { type: String, enum: ["pending_payment", "payment_review", "paid", "delivered", "cancelled"], default: "pending_payment" },
    recipient: { name: String, phone: String, message: String },
    payment: {
      method: String,
      receiptPath: String,
      receiptMime: String,
      uploadedAt: Date,
      approvedAt: Date,
      approvedBy: String,
      mpPaymentId: String,
    },
    issued: { giftCards: [String], packs: [String] },
    notes: String,
    whatsappSentAt: Date,
  },
  { timestamps: true },
);

export const Order = model("Order", orderSchema);
