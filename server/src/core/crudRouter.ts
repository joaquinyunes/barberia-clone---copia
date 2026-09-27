import { Router, type RequestHandler } from "express";
import type { Model } from "mongoose";
import type { ZodObject, ZodRawShape } from "zod";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { AppError } from "../lib/AppError.js";
import { audit, diff } from "../modules/audit/audit.service.js";
import type { Permission } from "./permissions.js";

interface CrudOptions {
  model: Model<any>;
  entity: string; // nombre legible para auditoría ("Proveedor")
  permission: Permission;
  schema?: ZodObject<ZodRawShape>;
  searchFields?: string[];
  filterFields?: string[];
  populate?: string | string[];
  sort?: Record<string, 1 | -1>;
  label?: (doc: any) => string;
  /** Si es true, DELETE marca active=false en lugar de borrar (conserva historial). */
  softDelete?: boolean;
  beforeCreate?: (data: any, req: Parameters<RequestHandler>[0]) => Promise<any> | any;
  afterCreate?: (doc: any, req: Parameters<RequestHandler>[0]) => Promise<void> | void;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Genera las rutas estándar (listar con búsqueda/filtros/paginado, ver, crear,
 * editar, borrar) con autenticación, permisos, validación y auditoría.
 * Los módulos con lógica propia agregan sus rutas extra sobre el router devuelto.
 */
export function crudRouter(opts: CrudOptions) {
  const router = Router();
  const { model, entity, permission } = opts;
  const label = opts.label ?? ((d: any) => d.name ?? d.code ?? String(d._id));
  router.use(authenticate, authorize(permission));

  router.get("/", async (req, res) => {
    const q = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (q.search && opts.searchFields?.length) {
      const rx = new RegExp(escapeRegex(q.search), "i");
      filter.$or = opts.searchFields.map((f) => ({ [f]: rx }));
    }
    for (const f of opts.filterFields ?? []) {
      if (q[f] !== undefined && q[f] !== "") filter[f] = q[f] === "true" ? true : q[f] === "false" ? false : q[f];
    }
    const limit = Math.min(Number(q.limit) || 50, 500);
    const page = Math.max(Number(q.page) || 1, 1);
    let query = model.find(filter).sort(opts.sort ?? { createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    if (opts.populate) query = query.populate(opts.populate as string);
    const [items, total] = await Promise.all([query.lean(), model.countDocuments(filter)]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  });

  router.get("/:id", async (req, res) => {
    let query = model.findById(req.params.id);
    if (opts.populate) query = query.populate(opts.populate as string);
    const doc = await query.lean();
    if (!doc) throw AppError.notFound(entity);
    res.json(doc);
  });

  const bodySchema = opts.schema;
  router.post("/", ...(bodySchema ? [validate({ body: bodySchema })] : []), async (req, res) => {
    const data = opts.beforeCreate ? await opts.beforeCreate(req.body, req) : req.body;
    const doc = await model.create(data);
    await opts.afterCreate?.(doc, req);
    await audit(req, { action: "create", entity, entityId: doc._id, summary: `creó ${entity.toLowerCase()} "${label(doc)}"` });
    res.status(201).json(doc);
  });

  router.patch("/:id", ...(bodySchema ? [validate({ body: bodySchema.partial() })] : []), async (req, res) => {
    const doc = await model.findById(req.params.id);
    if (!doc) throw AppError.notFound(entity);
    const before = doc.toObject();
    doc.$locals.changedBy = req.user?.name;
    doc.set(req.body);
    await doc.save();
    const changes = diff(before, doc.toObject());
    if (Object.keys(changes).length) {
      await audit(req, {
        action: "update",
        entity,
        entityId: doc._id,
        summary: `modificó ${entity.toLowerCase()} "${label(doc)}" (${Object.keys(changes).join(", ")})`,
        changes,
      });
    }
    res.json(doc);
  });

  router.delete("/:id", async (req, res) => {
    const doc = await model.findById(req.params.id);
    if (!doc) throw AppError.notFound(entity);
    if (opts.softDelete) {
      doc.set({ active: false });
      await doc.save();
    } else {
      await doc.deleteOne();
    }
    await audit(req, {
      action: "delete",
      entity,
      entityId: doc._id,
      summary: `${opts.softDelete ? "desactivó" : "eliminó"} ${entity.toLowerCase()} "${label(doc)}"`,
    });
    res.status(204).end();
  });

  return router;
}
