import { z } from "zod";
import { crudRouter } from "../../core/crudRouter.js";
import { Location } from "./location.model.js";

const schema = z.object({
  slug: z.string().min(2),
  name: z.string().min(2),
  tagline: z.string().optional(),
  address: z.string().min(3),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
  phone: z.string().optional(),
  whatsapp: z.string().regex(/^\d{10,15}$/, "Número en formato internacional, solo dígitos"),
  email: z.string().email().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  heroImage: z.string().optional(),
  openingHours: z
    .array(z.object({ day: z.number().min(0).max(6), open: z.string(), close: z.string(), closed: z.boolean().optional() }))
    .optional(),
  bankAlias: z.string().optional(),
  bankCbu: z.string().optional(),
  bankHolder: z.string().optional(),
  depositAmount: z.number().min(0).optional(),
  isVip: z.boolean().optional(),
  order: z.number().optional(),
  active: z.boolean().optional(),
});

export const locationsAdminRouter = crudRouter({
  model: Location,
  entity: "Sede",
  permission: "settings.manage",
  schema,
  searchFields: ["name", "address"],
  sort: { order: 1 },
  softDelete: true,
});
