import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { ROLES } from "../../core/permissions.js";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: String,
    passwordHash: { type: String, required: true, select: true },
    role: { type: String, enum: ROLES, default: "customer" },
    extraPermissions: { type: [String], default: [] },
    barber: { type: Schema.Types.ObjectId, ref: "Barber" },
    client: { type: Schema.Types.ObjectId, ref: "Client" },
    locations: [{ type: Schema.Types.ObjectId, ref: "Location" }], // vacío = todas
    active: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

userSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    delete ret.tokenVersion;
    return ret;
  },
});

export type UserData = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserData>;
export const User = model("User", userSchema);
