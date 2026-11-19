import { Schema, model } from "mongoose";

/**
 * Una intención de suscripción vigente por cliente (30 min): un doble clic, o dos pestañas, reciben el mismo link
 * en vez de crear dos suscripciones en Mercado Pago que después se cobrarían dos veces.
 */
const intentSchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true, unique: true },
    plan: { type: Schema.Types.ObjectId, ref: "MembershipPlan", required: true },
    preapprovalId: String,
    initPoint: String,
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
);

export const SubscriptionIntent = model("SubscriptionIntent", intentSchema);
