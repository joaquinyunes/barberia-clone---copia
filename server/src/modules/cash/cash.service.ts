import { Types } from "mongoose";
import { AppError } from "../../lib/AppError.js";
import { PAYMENT_METHODS, paymentFee, type PaymentMethod } from "../settings/settings.model.js";
import { CashMovement, CashSession, CASH_CATEGORIES, type CashCategory } from "./cash.model.js";
import type { Actor } from "../ledger/ledger.service.js";

export interface CashInput {
  location: unknown;
  direction: "in" | "out";
  method: PaymentMethod;
  amount: number;
  category: CashCategory;
  concept?: string;
  party?: { kind: string; id: unknown; name?: string };
  ref?: { kind: string; id: unknown };
  actor?: Actor;
  date?: Date;
}

export const openSession = (location: unknown) => CashSession.findOne({ location, status: "open" });

/**
 * Registra dinero real que entra o sale. El efectivo exige caja abierta en la sede;
 * los medios electrónicos se asocian a la caja abierta si existe.
 */
export async function record(input: CashInput) {
  const amount = Math.round(input.amount);
  if (!(amount > 0)) throw AppError.badRequest("El monto debe ser mayor a 0");
  if (!input.location) throw AppError.badRequest("Falta la sede de la operación");
  const session = await openSession(input.location);
  if (!session && input.method === "cash") {
    throw AppError.conflict("No hay caja abierta en esta sede. Abrí la caja para operar en efectivo.");
  }
  const fee = input.direction === "in" ? await paymentFee(input.method, amount) : 0;
  return CashMovement.create({
    session: session?._id,
    location: input.location,
    direction: input.direction,
    method: input.method,
    amount,
    fee,
    category: input.category,
    concept: input.concept ?? CASH_CATEGORIES[input.category],
    party: input.party,
    ref: input.ref,
    date: input.date ?? new Date(),
    createdBy: input.actor?._id,
    createdByName: input.actor?.name ?? "Sistema",
  });
}

export async function open(location: string, openingAmount: number, actor: Actor) {
  if (await openSession(location)) throw AppError.conflict("Ya hay una caja abierta en esta sede");
  return CashSession.create({ location, openingAmount, openedBy: actor.name });
}

const zero = () => Object.fromEntries(PAYMENT_METHODS.map((m) => [m, 0])) as Record<PaymentMethod, number>;

/** Totales de una caja: entradas/salidas por medio, por categoría y caja esperada. */
export async function sessionTotals(sessionId: Types.ObjectId | string) {
  const session = await CashSession.findById(sessionId);
  if (!session) throw AppError.notFound("Caja");
  const movements = await CashMovement.find({ session: session._id, voided: { $ne: true } }).lean();
  const inByMethod = zero();
  const outByMethod = zero();
  const byCategory: Record<string, number> = {};
  let fees = 0;
  for (const m of movements) {
    const method = m.method as PaymentMethod;
    if (m.direction === "in") inByMethod[method] += m.amount;
    else outByMethod[method] += m.amount;
    byCategory[m.category] = (byCategory[m.category] ?? 0) + (m.direction === "in" ? m.amount : -m.amount);
    fees += m.fee ?? 0;
  }
  const expected = zero();
  for (const m of PAYMENT_METHODS) expected[m] = inByMethod[m] - outByMethod[m];
  expected.cash += session.openingAmount;
  return { session, movements, inByMethod, outByMethod, byCategory, expected, fees };
}

export async function close(
  sessionId: string,
  counted: Partial<Record<PaymentMethod, number>>,
  actor: Actor,
  extra: { denominations?: Record<string, number>; notes?: string; summary?: unknown },
) {
  const totals = await sessionTotals(sessionId);
  const { session, expected, fees } = totals;
  if (session.status === "closed") throw AppError.conflict("La caja ya está cerrada");
  const countedFull = { ...expected, ...counted };
  const difference = zero();
  for (const m of PAYMENT_METHODS) difference[m] = (countedFull[m] ?? 0) - expected[m];
  session.set({
    status: "closed",
    closedAt: new Date(),
    closedBy: actor.name,
    expected,
    counted: countedFull,
    difference,
    fees,
    denominations: extra.denominations,
    notes: extra.notes,
    summary: extra.summary,
  });
  await session.save();
  return session;
}
