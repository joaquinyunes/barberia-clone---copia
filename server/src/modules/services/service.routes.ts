import { z } from "zod";
import { crudRouter } from "../../core/crudRouter.js";
import { validate } from "../../middlewares/validate.js";
import { roundTo } from "../../lib/money.js";
import { audit } from "../audit/audit.service.js";
import { Service, SERVICE_CATEGORIES, COMMISSION_TYPES } from "./service.model.js";

const commission = z.object({ type: z.enum(COMMISSION_TYPES), value: z.number().min(0) });

const schema = z.object({
  slug: z.string().min(2),
  name: z.string().min(2),
  category: z.enum(SERVICE_CATEGORIES),
  description: z.string().optional(),
  includes: z.array(z.string()).optional(),
  durationMin: z.number().int().min(5),
  price: z.number().min(0),
  supplyCost: z.number().min(0).optional(),
  commission: commission.nullable().optional(),
  locations: z.array(z.string()).optional(),
  image: z.string().optional(),
  featured: z.boolean().optional(),
  order: z.number().optional(),
  active: z.boolean().optional(),
});

export const servicesAdminRouter = crudRouter({
  model: Service,
  entity: "Servicio",
  permission: "catalog.manage",
  schema,
  searchFields: ["name", "slug"],
  filterFields: ["category", "active"],
  sort: { order: 1, name: 1 },
  softDelete: true,
  beforeCreate: (data, req) => ({ ...data, priceHistory: [{ price: data.price, from: new Date(), changedBy: req.user?.name }] }),
});

/**
 * "Modo inflación": actualización masiva de precios por %, con redondeo,
 * filtrando por categoría. Cada cambio queda en el historial y en auditoría.
 */
servicesAdminRouter.post(
  "/bulk-price",
  validate({
    body: z.object({
      percent: z.number().min(-50).max(300),
      roundTo: z.number().min(0).default(500),
      categories: z.array(z.enum(SERVICE_CATEGORIES)).optional(),
      dryRun: z.boolean().default(false),
    }),
  }),
  async (req, res) => {
    const { percent, roundTo: step, categories, dryRun } = req.body;
    const services = await Service.find({ active: true, ...(categories?.length && { category: { $in: categories } }) });
    const preview = services.map((s) => ({
      id: s._id,
      name: s.name,
      from: s.price,
      to: roundTo(s.price * (1 + percent / 100), step),
    }));
    if (!dryRun) {
      for (const s of services) {
        s.$locals.changedBy = req.user?.name;
        s.price = preview.find((p) => String(p.id) === String(s._id))!.to;
        await s.save();
      }
      await audit(req, { action: "update", entity: "Servicio", summary: `actualizó ${services.length} precios un ${percent}%`, changes: preview });
    }
    res.json({ applied: !dryRun, preview });
  },
);
