import { Schema, model } from "mongoose";

const auditSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    userName: String,
    role: String,
    action: { type: String, required: true }, // create | update | delete | custom
    entity: { type: String, required: true },
    entityId: String,
    summary: { type: String, required: true },
    changes: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
auditSchema.index({ createdAt: -1 });
auditSchema.index({ entity: 1, entityId: 1 });

export const AuditLog = model("AuditLog", auditSchema);
