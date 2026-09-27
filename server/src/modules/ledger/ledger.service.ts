import { Types } from "mongoose";
import { AppError } from "../../lib/AppError.js";
import { Account, Movement, MOVEMENT_TYPES, type MovementType, type OwnerType } from "./ledger.model.js";

const MODEL: Record<OwnerType, string> = { client: "Client", barber: "Barber", supplier: "Supplier" };

export interface Actor {
  _id?: unknown;
  name?: string;
}

export interface PostInput {
  ownerType: OwnerType;
  owner: Types.ObjectId | string;
  type: MovementType;
  amount: number; // con signo
  concept?: string;
  date?: Date;
  location?: unknown;
  ref?: { kind: string; id: unknown };
  method?: string;
  actor?: Actor;
}

export async function getAccount(ownerType: OwnerType, owner: Types.ObjectId | string) {
  return Account.findOneAndUpdate(
    { ownerType, owner },
    { $setOnInsert: { ownerType, owner, ownerModel: MODEL[ownerType], balance: 0 } },
    { upsert: true, new: true },
  );
}

/** Registra un movimiento y actualiza el saldo de forma atómica ($inc). */
export async function post(input: PostInput) {
  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount === 0) throw AppError.badRequest("El monto del movimiento no puede ser 0");
  const account = await Account.findOneAndUpdate(
    { ownerType: input.ownerType, owner: input.owner },
    {
      $inc: { balance: amount },
      $setOnInsert: { ownerType: input.ownerType, owner: input.owner, ownerModel: MODEL[input.ownerType] },
    },
    { upsert: true, new: true },
  );
  return Movement.create({
    account: account!._id,
    ownerType: input.ownerType,
    owner: input.owner,
    type: input.type,
    amount,
    balanceAfter: account!.balance,
    concept: input.concept ?? MOVEMENT_TYPES[input.type],
    date: input.date ?? new Date(),
    location: input.location,
    ref: input.ref,
    method: input.method,
    createdBy: input.actor?._id,
    createdByName: input.actor?.name ?? "Sistema",
  });
}

/** Anula un movimiento con un contra-asiento (el original queda marcado, nunca se borra). */
export async function reverse(movementId: string, actor: Actor, reason: string) {
  const original = await Movement.findById(movementId);
  if (!original) throw AppError.notFound("Movimiento");
  if (original.reversed || original.type === "reversal") throw AppError.conflict("El movimiento ya fue anulado");
  const reversal = await post({
    ownerType: original.ownerType as OwnerType,
    owner: original.owner,
    type: "reversal",
    amount: -original.amount,
    concept: `Anulación: ${original.concept} — ${reason}`,
    location: original.location,
    ref: { kind: "Movement", id: original._id },
    actor,
  });
  original.reversed = true;
  await original.save();
  reversal.reversalOf = original._id;
  await reversal.save();
  return reversal;
}

export async function balanceOf(ownerType: OwnerType, owner: Types.ObjectId | string) {
  const acc = await Account.findOne({ ownerType, owner }).lean();
  return acc?.balance ?? 0;
}

/** Saldo a una fecha de corte (suma de movimientos anteriores a `at`). */
export async function balanceAt(ownerType: OwnerType, owner: Types.ObjectId | string, at: Date) {
  const [row] = await Movement.aggregate<{ total: number }>([
    { $match: { ownerType, owner: new Types.ObjectId(String(owner)), date: { $lt: at } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return row?.total ?? 0;
}

export async function statement(ownerType: OwnerType, owner: string, from?: Date, to?: Date) {
  const filter: Record<string, unknown> = { ownerType, owner: new Types.ObjectId(owner) };
  if (from || to) filter.date = { ...(from && { $gte: from }), ...(to && { $lt: to }) };
  const [movements, balance] = await Promise.all([
    Movement.find(filter).sort({ date: -1, createdAt: -1 }).limit(500).lean(),
    balanceOf(ownerType, owner),
  ]);
  return { balance, movements };
}

/** Suma de movimientos por tipo en un período (base de liquidaciones y reportes). */
export async function totalsByType(ownerType: OwnerType, owner: string | Types.ObjectId, from: Date, to: Date) {
  const rows = await Movement.aggregate<{ _id: string; total: number; count: number }>([
    { $match: { ownerType, owner: new Types.ObjectId(String(owner)), date: { $gte: from, $lt: to }, reversed: { $ne: true }, type: { $ne: "reversal" } } },
    { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.total])) as Partial<Record<MovementType, number>>;
}

/** Totales de todas las cuentas de un tipo: cuánto se debe y cuánto nos deben. */
export async function balancesSummary(ownerType: OwnerType) {
  const [row] = await Account.aggregate<{ positive: number; negative: number; positiveCount: number; negativeCount: number }>([
    { $match: { ownerType } },
    {
      $group: {
        _id: null,
        positive: { $sum: { $cond: [{ $gt: ["$balance", 0] }, "$balance", 0] } },
        negative: { $sum: { $cond: [{ $lt: ["$balance", 0] }, "$balance", 0] } },
        positiveCount: { $sum: { $cond: [{ $gt: ["$balance", 0] }, 1, 0] } },
        negativeCount: { $sum: { $cond: [{ $lt: ["$balance", 0] }, 1, 0] } },
      },
    },
  ]);
  return row ?? { positive: 0, negative: 0, positiveCount: 0, negativeCount: 0 };
}

export async function accountsWithBalance(ownerType: OwnerType, sign: "positive" | "negative") {
  return Account.find({ ownerType, balance: sign === "positive" ? { $gt: 0 } : { $lt: 0 } })
    .populate("owner", "name phone")
    .sort({ balance: sign === "positive" ? -1 : 1 })
    .limit(200)
    .lean();
}
