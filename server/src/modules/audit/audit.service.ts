import type { Request } from "express";
import { AuditLog } from "./audit.model.js";

interface Actor {
  _id?: unknown;
  name?: string;
  role?: string;
}

/** Registra un cambio importante. Nunca rompe la operación principal si falla. */
export async function audit(
  actor: Actor | Request | undefined,
  entry: { action: string; entity: string; entityId?: unknown; summary: string; changes?: unknown },
) {
  const user = actor && "headers" in actor ? (actor as Request).user : (actor as Actor | undefined);
  try {
    await AuditLog.create({
      user: user?._id,
      userName: user?.name ?? "Sistema",
      role: user?.role ?? "system",
      ...entry,
      entityId: entry.entityId ? String(entry.entityId) : undefined,
    });
  } catch {
    /* la auditoría no debe interrumpir el flujo */
  }
}

/** Diferencias campo a campo entre dos objetos planos (para "cambió precio de Fade: 12000 → 14000"). */
export function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) {
    if (["updatedAt", "createdAt", "__v"].includes(key)) continue;
    const a = JSON.stringify(before[key]);
    const b = JSON.stringify(after[key]);
    if (a !== b) changes[key] = { from: before[key], to: after[key] };
  }
  return changes;
}
