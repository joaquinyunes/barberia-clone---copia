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

// Bitácora inmutable: ninguna ruta ni código de la app puede modificar o borrar registros.
const readOnly = () => { throw new Error("La auditoría es de solo lectura"); };
for (const op of ["updateOne", "updateMany", "findOneAndUpdate", "findOneAndReplace", "replaceOne", "deleteOne", "deleteMany", "findOneAndDelete"] as const) {
  auditSchema.pre(op, readOnly);
}
auditSchema.pre("bulkWrite" as never, readOnly as never);
auditSchema.pre("save", function () {
  if (!this.isNew) readOnly();
});

export const AuditLog = model("AuditLog", auditSchema);
