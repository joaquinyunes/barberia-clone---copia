import { Router } from "express";
import { z } from "zod";
import { crudRouter } from "../../core/crudRouter.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../lib/AppError.js";
import { addDays } from "../../lib/dates.js";
import { formatARS } from "../../lib/money.js";
import { audit } from "../audit/audit.service.js";
import * as cash from "../cash/cash.service.js";
import * as ledger from "../ledger/ledger.service.js";
import { PAYMENT_METHODS } from "../settings/settings.model.js";
import { Station } from "../stations/station.model.js";
import { Expense, Product, PRODUCT_KINDS, Purchase, StockMovement, Supplier, Tool } from "./inventory.models.js";
import * as inventory from "./inventory.service.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");
const method = z.enum(PAYMENT_METHODS);

/* ── Productos ── */
export const productsRouter = crudRouter({
  model: Product,
  entity: "Producto",
  permission: "inventory.manage",
  schema: z.object({
    name: z.string().min(2),
    slug: z.string().optional(),
    sku: z.string().optional(),
    kind: z.enum(Object.keys(PRODUCT_KINDS) as [string]).optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    images: z.array(z.string()).optional(),
    cost: z.number().min(0).optional(),
    price: z.number().min(0).optional(),
    stock: z.number().optional(),
    minStock: z.number().min(0).optional(),
    unit: z.string().optional(),
    supplier: objectId.nullable().optional(),
    giftValue: z.number().min(0).optional(),
    shop: z.boolean().optional(),
    featured: z.boolean().optional(),
    active: z.boolean().optional(),
  }),
  searchFields: ["name", "sku", "category"],
  filterFields: ["kind", "active", "shop"],
  populate: "supplier",
  sort: { kind: 1, name: 1 },
  softDelete: true,
});

export const stockRouter = Router();
stockRouter.use(authenticate, authorize("inventory.manage"));

stockRouter.get("/movements", async (req, res) => {
  const { product, type, barber } = req.query as Record<string, string>;
  const items = await StockMovement.find({ ...(product && { product }), ...(type && { type }), ...(barber && { barber }) })
    .populate("product", "name unit")
    .populate("barber", "name")
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();
  res.json({ items });
});

stockRouter.get("/low", async (_req, res) => {
  const items = await Product.find({ active: true, kind: { $ne: "giftcard" }, $expr: { $lte: ["$stock", "$minStock"] } }).lean();
  res.json({ items });
});

stockRouter.post(
  "/adjust",
  validate({ body: z.object({ product: objectId, qty: z.number().refine((n) => n !== 0), type: z.enum(["adjustment", "loss", "return"]), reason: z.string().min(2) }) }),
  async (req, res) => {
    const p = await inventory.moveStock({ ...req.body, allowNegative: true, actor: req.user });
    await audit(req, { action: "update", entity: "Stock", entityId: p._id, summary: `ajustó stock de ${p.name} (${req.body.qty > 0 ? "+" : ""}${req.body.qty}): ${req.body.reason}` });
    res.json(p);
  },
);

stockRouter.post(
  "/consumption",
  validate({
    body: z.object({
      barber: objectId,
      items: z.array(z.object({ product: objectId, qty: z.number().positive() })).min(1),
      reason: z.string().optional(),
      chargeToBarber: z.enum(["none", "cost", "price"]).default("none"),
    }),
  }),
  async (req, res) => {
    const r = await inventory.registerConsumption({ ...req.body, actor: req.user! });
    await audit(req, { action: "create", entity: "Consumo", summary: `registró retiro de ${r.lines.join(", ")}${r.charge ? ` (descontado ${formatARS(r.charge)})` : ""}` });
    res.status(201).json(r);
  },
);

/* ── Proveedores y compras ── */
export const suppliersRouter = crudRouter({
  model: Supplier,
  entity: "Proveedor",
  permission: "suppliers.manage",
  schema: z.object({
    name: z.string().min(2),
    contactName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    cuit: z.string().optional(),
    address: z.string().optional(),
    supplies: z.string().optional(),
    paymentTerms: z.string().optional(),
    notes: z.string().optional(),
    active: z.boolean().optional(),
  }),
  searchFields: ["name", "cuit", "supplies"],
  sort: { name: 1 },
  softDelete: true,
});

suppliersRouter.get("/:id/account", async (req, res) => {
  const supplier = await Supplier.findById(req.params.id).lean();
  if (!supplier) throw AppError.notFound("Proveedor");
  const [statement, purchases] = await Promise.all([
    ledger.statement("supplier", String(req.params.id)),
    Purchase.find({ supplier: supplier._id }).sort({ date: -1 }).limit(50).lean(),
  ]);
  const purchased = purchases.reduce((a, p) => a + (p.total ?? 0), 0);
  res.json({ supplier, ...statement, purchases, purchased, lastPurchase: purchases[0]?.date ?? null });
});

suppliersRouter.post(
  "/:id/payments",
  validate({ body: z.object({ amount: z.number().positive(), method, location: objectId, concept: z.string().optional() }) }),
  async (req, res) => {
    const m = await inventory.paySupplier({ ...req.body, supplier: String(req.params.id), actor: req.user! });
    await audit(req, { action: "create", entity: "Pago a proveedor", entityId: req.params.id, summary: `pagó ${formatARS(req.body.amount)} a proveedor` });
    res.status(201).json(m);
  },
);

export const purchasesRouter = Router();
purchasesRouter.use(authenticate, authorize("suppliers.manage"));
purchasesRouter.get("/", async (req, res) => {
  const { supplier } = req.query as Record<string, string>;
  res.json({ items: await Purchase.find(supplier ? { supplier } : {}).populate("supplier", "name").sort({ date: -1 }).limit(200).lean() });
});
purchasesRouter.post(
  "/",
  validate({
    body: z.object({
      supplier: objectId,
      items: z.array(z.object({ product: objectId, qty: z.number().positive(), unitCost: z.number().min(0) })).min(1),
      date: z.coerce.date().optional(),
      paidAmount: z.number().min(0).optional(),
      method: method.optional(),
      location: objectId,
      invoiceNumber: z.string().optional(),
      notes: z.string().optional(),
    }),
  }),
  async (req, res) => {
    const p = await inventory.createPurchase({ ...req.body, actor: req.user! });
    await audit(req, { action: "create", entity: "Compra", entityId: p._id, summary: `registró compra #${p.number} por ${formatARS(p.total ?? 0)}` });
    res.status(201).json(p);
  },
);

/* ── Gastos ── */
export const expensesRouter = Router();
expensesRouter.use(authenticate, authorize("expenses.manage"));
expensesRouter.get("/", async (req, res) => {
  const { category, from, to, location } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { voided: { $ne: true } };
  if (category) filter.category = category;
  if (location) filter.location = location;
  if (from || to) filter.date = { ...(from && { $gte: new Date(from) }), ...(to && { $lt: new Date(to) }) };
  const items = await Expense.find(filter).populate("supplier barber", "name").sort({ date: -1 }).limit(300).lean();
  res.json({ items, total: items.reduce((a, e) => a + e.amount, 0) });
});
expensesRouter.post(
  "/",
  validate({
    body: z.object({
      date: z.coerce.date().optional(),
      amount: z.number().positive(),
      category: z.string().min(2),
      supplier: objectId.optional(),
      barber: objectId.optional(),
      method,
      location: objectId,
      description: z.string().optional(),
      recurring: z.boolean().optional(),
    }),
  }),
  async (req, res) => {
    const e = await inventory.createExpense({ ...req.body, actor: req.user! });
    await audit(req, { action: "create", entity: "Gasto", entityId: e._id, summary: `registró gasto ${req.body.category} ${formatARS(req.body.amount)}` });
    res.status(201).json(e);
  },
);
expensesRouter.post("/:id/void", validate({ body: z.object({ reason: z.string().min(3) }) }), async (req, res) => {
  const e = await Expense.findById(req.params.id);
  if (!e || e.voided) throw AppError.notFound("Gasto");
  e.voided = true;
  await e.save();
  // contra-asiento en caja: vuelve a entrar el dinero
  await cash.record({ location: e.location, direction: "in", method: e.method as never, amount: e.amount, category: "refund", concept: `Anulación gasto: ${req.body.reason}`, ref: { kind: "Expense", id: e._id }, actor: req.user });
  await audit(req, { action: "delete", entity: "Gasto", entityId: e._id, summary: `anuló gasto ${e.category} ${formatARS(e.amount)}: ${req.body.reason}` });
  res.json(e);
});

/* ── Herramientas ── */
export const toolsRouter = crudRouter({
  model: Tool,
  entity: "Herramienta",
  permission: "inventory.manage",
  schema: z.object({
    code: z.string().min(1),
    name: z.string().min(2),
    brand: z.string().optional(),
    type: z.string().optional(),
    owner: z.enum(["business", "barber"]).optional(),
    ownerBarber: objectId.nullable().optional(),
    station: objectId.nullable().optional(),
    location: objectId.nullable().optional(),
    purchaseCost: z.number().min(0).optional(),
    purchaseDate: z.coerce.date().optional(),
    status: z.enum(["ok", "maintenance", "broken", "retired"]).optional(),
    maintenanceEveryDays: z.number().int().min(1).optional(),
    notes: z.string().optional(),
  }),
  searchFields: ["code", "name", "brand"],
  filterFields: ["status", "assignedTo", "owner"],
  populate: ["assignedTo", "ownerBarber", "station"] as never,
  sort: { code: 1 },
});

toolsRouter.post("/:id/assign", validate({ body: z.object({ barber: objectId.nullable() }) }), async (req, res) => {
  const tool = await Tool.findById(req.params.id);
  if (!tool) throw AppError.notFound("Herramienta");
  const open = tool.assignments.find((a) => !a.to);
  if (open) open.to = new Date(); // devolución de la asignación anterior
  if (req.body.barber) tool.assignments.push({ barber: req.body.barber, from: new Date() });
  tool.assignedTo = req.body.barber ?? undefined;
  await tool.save();
  await audit(req, { action: "update", entity: "Herramienta", entityId: tool._id, summary: req.body.barber ? `asignó ${tool.code} a un barbero` : `registró la devolución de ${tool.code}` });
  res.json(await tool.populate("assignedTo", "name"));
});

toolsRouter.post(
  "/:id/maintenance",
  validate({ body: z.object({ type: z.string().min(2), cost: z.number().min(0).optional(), notes: z.string().optional(), date: z.coerce.date().optional() }) }),
  async (req, res) => {
    const tool = await Tool.findById(req.params.id);
    if (!tool) throw AppError.notFound("Herramienta");
    const date = req.body.date ?? new Date();
    tool.maintenance.push({ ...req.body, date, by: req.user?.name });
    tool.lastMaintenanceAt = date;
    tool.nextMaintenanceAt = addDays(date, tool.maintenanceEveryDays ?? 30);
    if (tool.status === "maintenance") tool.status = "ok";
    await tool.save();
    res.status(201).json(tool);
  },
);

/* ── Puestos ── */
export const stationsRouter = crudRouter({
  model: Station,
  entity: "Puesto",
  permission: "inventory.manage",
  schema: z.object({
    name: z.string().min(1),
    location: objectId,
    status: z.enum(["available", "occupied", "maintenance", "out_of_service"]).optional(),
    barber: objectId.nullable().optional(),
    notes: z.string().optional(),
    active: z.boolean().optional(),
  }),
  filterFields: ["location", "status"],
  populate: ["barber", "location"] as never,
  sort: { name: 1 },
});

stationsRouter.post("/:id/clean", async (req, res) => {
  const s = await Station.findById(req.params.id);
  if (!s) throw AppError.notFound("Puesto");
  s.lastCleaningAt = new Date();
  s.cleaningLog.push({ at: new Date(), by: req.user?.name });
  await s.save();
  res.json(s);
});
