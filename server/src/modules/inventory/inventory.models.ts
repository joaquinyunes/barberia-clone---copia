import { Schema, model } from "mongoose";

/* Productos: venta (pomadas, ceras), uso interno (cuchillas, toallas) y gift cards de la tienda. */
export const PRODUCT_KINDS = { sale: "Venta", operational: "Uso interno", giftcard: "Gift card / voucher" } as const;

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true },
    sku: { type: String, unique: true, sparse: true },
    kind: { type: String, enum: Object.keys(PRODUCT_KINDS), default: "sale" },
    category: String,
    description: String,
    images: [String],
    cost: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    unit: { type: String, default: "unidad" },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
    giftValue: Number, // para gift cards: valor que se acredita
    shop: { type: Boolean, default: false }, // visible en la tienda online
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const STOCK_MOVEMENT_TYPES = {
  purchase: "Compra",
  sale: "Venta",
  consumption: "Consumo / retiro",
  adjustment: "Ajuste de inventario",
  return: "Devolución",
  loss: "Pérdida / rotura",
} as const;

const stockMovementSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    type: { type: String, enum: Object.keys(STOCK_MOVEMENT_TYPES), required: true },
    qty: { type: Number, required: true }, // con signo
    stockAfter: Number,
    unitCost: Number,
    reason: String,
    barber: { type: Schema.Types.ObjectId, ref: "Barber" },
    location: { type: Schema.Types.ObjectId, ref: "Location" },
    ref: { kind: String, id: Schema.Types.ObjectId },
    createdByName: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
stockMovementSchema.index({ product: 1, createdAt: -1 });

const supplierSchema = new Schema(
  {
    name: { type: String, required: true },
    contactName: String,
    phone: String,
    email: String,
    cuit: String,
    address: String,
    supplies: String, // qué productos provee
    paymentTerms: String,
    notes: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const purchaseSchema = new Schema(
  {
    number: { type: Number, unique: true },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    date: { type: Date, default: Date.now },
    location: { type: Schema.Types.ObjectId, ref: "Location" },
    items: [{ product: { type: Schema.Types.ObjectId, ref: "Product" }, name: String, qty: Number, unitCost: Number, _id: false }],
    total: Number,
    paidAmount: { type: Number, default: 0 },
    method: String,
    invoiceNumber: String,
    receiptPath: String,
    notes: String,
    createdByName: String,
  },
  { timestamps: true },
);

const expenseSchema = new Schema(
  {
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true, min: 1 },
    category: { type: String, required: true },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
    barber: { type: Schema.Types.ObjectId, ref: "Barber" }, // gasto asignado a un barbero
    method: { type: String, required: true },
    location: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    description: String,
    receiptPath: String,
    recurring: { type: Boolean, default: false }, // gastos fijos (alquiler, internet) para la proyección
    createdByName: String,
    voided: { type: Boolean, default: false },
  },
  { timestamps: true },
);
expenseSchema.index({ date: -1 });

/* Herramientas / activos (máquinas, trimmers, tijeras) con asignación y mantenimiento. */
const toolSchema = new Schema(
  {
    code: { type: String, required: true, unique: true }, // "JRL #003"
    name: { type: String, required: true },
    brand: String,
    type: { type: String, default: "máquina" },
    owner: { type: String, enum: ["business", "barber"], default: "business" },
    ownerBarber: { type: Schema.Types.ObjectId, ref: "Barber" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "Barber" },
    station: { type: Schema.Types.ObjectId, ref: "Station" },
    location: { type: Schema.Types.ObjectId, ref: "Location" },
    assignments: [{ barber: { type: Schema.Types.ObjectId, ref: "Barber" }, from: Date, to: Date, _id: false }],
    purchaseCost: Number,
    purchaseDate: Date,
    status: { type: String, enum: ["ok", "maintenance", "broken", "retired"], default: "ok" },
    maintenanceEveryDays: { type: Number, default: 30 },
    lastMaintenanceAt: Date,
    nextMaintenanceAt: Date,
    maintenance: [{ date: Date, type: { type: String }, cost: Number, notes: String, by: String, _id: false }],
    notes: String,
  },
  { timestamps: true },
);

export const Product = model("Product", productSchema);
export const StockMovement = model("StockMovement", stockMovementSchema);
export const Supplier = model("Supplier", supplierSchema);
export const Purchase = model("Purchase", purchaseSchema);
export const Expense = model("Expense", expenseSchema);
export const Tool = model("Tool", toolSchema);
