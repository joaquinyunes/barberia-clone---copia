import { Types } from "mongoose";
import { AppError } from "../../lib/AppError.js";
import * as cash from "../cash/cash.service.js";
import * as ledger from "../ledger/ledger.service.js";
import type { PaymentMethod } from "../settings/settings.model.js";
import { Barber } from "../barbers/barber.model.js";
import { Expense, Product, Purchase, StockMovement, Supplier, STOCK_MOVEMENT_TYPES } from "./inventory.models.js";

type Actor = ledger.Actor;

export async function moveStock(input: {
  product: string | Types.ObjectId;
  type: keyof typeof STOCK_MOVEMENT_TYPES;
  qty: number; // con signo
  reason?: string;
  barber?: unknown;
  location?: unknown;
  unitCost?: number;
  ref?: { kind: string; id: unknown };
  allowNegative?: boolean;
  actor?: Actor;
}) {
  const product = await Product.findOneAndUpdate(
    { _id: input.product, ...(input.qty < 0 && !input.allowNegative && { stock: { $gte: -input.qty } }) },
    { $inc: { stock: input.qty } },
    { new: true },
  );
  if (!product) {
    const exists = await Product.exists({ _id: input.product });
    throw exists ? AppError.conflict("Stock insuficiente") : AppError.notFound("Producto");
  }
  await StockMovement.create({
    product: product._id,
    type: input.type,
    qty: input.qty,
    stockAfter: product.stock,
    unitCost: input.unitCost,
    reason: input.reason,
    barber: input.barber,
    location: input.location,
    ref: input.ref,
    createdByName: input.actor?.name,
  });
  return product;
}

/** Retiro de productos por un barbero (1 pomada, 2 cuchillas). Opcionalmente se le descuenta. */
export async function registerConsumption(input: {
  barber: string;
  items: { product: string; qty: number }[];
  reason?: string;
  chargeToBarber?: "none" | "cost" | "price";
  actor: Actor;
}) {
  const barber = await Barber.findById(input.barber);
  if (!barber) throw AppError.notFound("Barbero");
  let charge = 0;
  const lines: string[] = [];
  for (const item of input.items) {
    const p = await moveStock({
      product: item.product,
      type: "consumption",
      qty: -Math.abs(item.qty),
      reason: input.reason ?? "Retiro de barbero",
      barber: barber._id,
      location: barber.location,
      actor: input.actor,
    });
    lines.push(`${item.qty} ${p.name}`);
    if (input.chargeToBarber === "cost") charge += p.cost * item.qty;
    if (input.chargeToBarber === "price") charge += p.price * item.qty;
  }
  if (charge > 0) {
    await ledger.post({ ownerType: "barber", owner: barber._id, type: "consumption", amount: -charge, concept: `Retiro: ${lines.join(", ")}`, actor: input.actor });
  }
  return { lines, charge };
}

export async function createPurchase(input: {
  supplier: string;
  items: { product: string; qty: number; unitCost: number }[];
  date?: Date;
  paidAmount?: number;
  method?: PaymentMethod;
  location: string;
  invoiceNumber?: string;
  notes?: string;
  actor: Actor;
}) {
  const supplier = await Supplier.findById(input.supplier);
  if (!supplier) throw AppError.notFound("Proveedor");
  const last = await Purchase.findOne().sort({ number: -1 }).lean();
  const items = [];
  for (const i of input.items) {
    const product = await Product.findById(i.product);
    if (!product) throw AppError.notFound("Producto");
    items.push({ product: product._id, name: product.name, qty: i.qty, unitCost: i.unitCost });
  }
  const total = items.reduce((a, i) => a + i.qty * i.unitCost, 0);
  const purchase = await Purchase.create({
    number: (last?.number ?? 0) + 1,
    supplier: supplier._id,
    date: input.date,
    location: input.location,
    items,
    total,
    method: input.method,
    invoiceNumber: input.invoiceNumber,
    notes: input.notes,
    createdByName: input.actor.name,
  });
  for (const i of items) {
    await moveStock({ product: i.product, type: "purchase", qty: i.qty, unitCost: i.unitCost, reason: `Compra #${purchase.number}`, location: input.location, ref: { kind: "Purchase", id: purchase._id }, actor: input.actor });
    await Product.updateOne({ _id: i.product }, { cost: i.unitCost, supplier: supplier._id }); // último costo
  }
  await ledger.post({ ownerType: "supplier", owner: supplier._id, type: "purchase", amount: total, concept: `Compra #${purchase.number}`, ref: { kind: "Purchase", id: purchase._id }, actor: input.actor });
  if (input.paidAmount && input.paidAmount > 0) {
    await paySupplier({ supplier: String(supplier._id), amount: input.paidAmount, method: input.method ?? "transfer", location: input.location, concept: `Pago compra #${purchase.number}`, actor: input.actor });
    purchase.paidAmount = input.paidAmount;
    await purchase.save();
  }
  return purchase;
}

export async function paySupplier(input: { supplier: string; amount: number; method: PaymentMethod; location: string; concept?: string; actor: Actor }) {
  const supplier = await Supplier.findById(input.supplier);
  if (!supplier) throw AppError.notFound("Proveedor");
  const concept = input.concept ?? "Pago a proveedor";
  const m = await ledger.post({ ownerType: "supplier", owner: supplier._id, type: "supplier_payment", amount: -input.amount, concept, method: input.method, actor: input.actor });
  await cash.record({
    location: input.location,
    direction: "out",
    method: input.method,
    amount: input.amount,
    category: "supplier_payment",
    concept: `${concept} — ${supplier.name}`,
    party: { kind: "Supplier", id: supplier._id, name: supplier.name },
    ref: { kind: "Movement", id: m._id },
    actor: input.actor,
  });
  return m;
}

export async function createExpense(input: {
  date?: Date;
  amount: number;
  category: string;
  supplier?: string;
  barber?: string;
  method: PaymentMethod;
  location: string;
  description?: string;
  recurring?: boolean;
  receiptPath?: string;
  actor: Actor;
}) {
  const expense = await Expense.create({ ...input, createdByName: input.actor.name });
  await cash.record({
    location: input.location,
    direction: "out",
    method: input.method,
    amount: input.amount,
    category: "expense",
    concept: `${input.category}${input.description ? ` — ${input.description}` : ""}`,
    ref: { kind: "Expense", id: expense._id },
    actor: input.actor,
    date: input.date,
  });
  return expense;
}
