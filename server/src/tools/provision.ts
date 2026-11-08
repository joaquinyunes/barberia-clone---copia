/**
 * V4 — Alta de una barbería nueva en una base VACÍA (sin datos de ejemplo).
 *   npm run provision -w server -- cliente.json [--secrets cliente.env.generated]
 * Crea: configuración, la sede con sus horarios, los servicios, los barberos y la cuenta de dueño con una
 * contraseña al azar (se muestra UNA vez). Se niega a correr si la base ya tiene usuarios.
 * Con --secrets escribe además un archivo con los 3 secretos al azar y las variables a cargar en Render/Vercel.
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "../config/db.js";
import { Barber } from "../modules/barbers/barber.model.js";
import { Location } from "../modules/locations/location.model.js";
import { Service } from "../modules/services/service.model.js";
import { Settings } from "../modules/settings/settings.model.js";
import { User } from "../modules/users/user.model.js";

const hours = z.object({ open: z.string().regex(/^\d{2}:\d{2}$/), close: z.string().regex(/^\d{2}:\d{2}$/), days: z.array(z.number().int().min(0).max(6)).min(1) });

export const clientConfig = z.object({
  businessName: z.string().min(2),
  whatsapp: z.string().regex(/^\d{10,15}$/, "WhatsApp internacional sin +, ej. 5491155555555"),
  owner: z.object({ name: z.string().min(2), email: z.string().email() }),
  location: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(2),
    address: z.string().min(3),
    city: z.string().default("Buenos Aires"),
    hours,
    depositAmount: z.number().int().min(0).default(0),
    bankAlias: z.string().optional(),
    bankHolder: z.string().optional(),
  }),
  services: z.array(z.object({ slug: z.string(), name: z.string(), category: z.string().default("corte"), durationMin: z.number().int().min(5), price: z.number().min(0) })).min(1),
  barbers: z.array(z.object({ name: z.string().min(2), commissionPct: z.number().min(0).max(100).default(50) })).min(1),
});
export type ClientConfig = z.infer<typeof clientConfig>;

const secret = () => randomBytes(32).toString("hex");

export async function provision(cfg: ClientConfig) {
  if (await User.estimatedDocumentCount()) throw new Error("La base ya tiene usuarios: esto es solo para una base vacía.");
  const password = randomBytes(12).toString("base64url"); // 16 caracteres; el dueño la cambia al ingresar
  await Settings.create({ key: "main", businessName: cfg.businessName, whatsappMain: cfg.whatsapp, defaultCommissionPct: 50 });
  const openDays = new Set(cfg.location.hours.days);
  const location = await Location.create({
    slug: cfg.location.slug,
    name: cfg.location.name,
    address: cfg.location.address,
    city: cfg.location.city,
    whatsapp: cfg.whatsapp,
    depositAmount: cfg.location.depositAmount,
    bankAlias: cfg.location.bankAlias,
    bankHolder: cfg.location.bankHolder,
    openingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => (openDays.has(day) ? { day, open: cfg.location.hours.open, close: cfg.location.hours.close } : { day, closed: true })),
  });
  await Service.create(cfg.services.map((s, i) => ({ ...s, order: i })));
  const schedule = [0, 1, 2, 3, 4, 5, 6].map((day) => (openDays.has(day) ? { day, start: cfg.location.hours.open, end: cfg.location.hours.close } : { day, off: true }));
  await Barber.create(cfg.barbers.map((b, i) => ({ name: b.name, slug: `${b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`, location: location._id, schedule, defaultCommissionPct: b.commissionPct, order: i })));
  await User.create({ name: cfg.owner.name, email: cfg.owner.email, passwordHash: await bcrypt.hash(password, 12), role: "admin" });
  return { password };
}

if (process.argv[1]?.endsWith("provision.ts")) {
  // npm ejecuta el script dentro de server/: las rutas relativas se resuelven desde donde se llamó a npm.
  const [file, flag, out] = process.argv.slice(2).map((a) => (a.startsWith("--") ? a : path.resolve(process.env.INIT_CWD ?? process.cwd(), a)));
  try {
    if (!file) throw new Error("Uso: provision <cliente.json> [--secrets <archivo>]");
    const cfg = clientConfig.parse(JSON.parse(readFileSync(file, "utf8")));
    await connectDB();
    const { password } = await provision(cfg);
    console.log(`Listo. Ingresá a /ingresar con ${cfg.owner.email} y la contraseña: ${password}\nCambiala en el primer ingreso y activá la verificación en dos pasos (Configuración → Seguridad).`);
    if (flag === "--secrets" && out) {
      writeFileSync(
        out,
        [
          "# Generado por npm run provision. Contiene secretos: NO lo subas al repo ni lo mandes por chat. Cargalo en Render y borralo.",
          "NODE_ENV=production",
          "MONGO_URI=PEGAR_LA_CADENA_DE_ATLAS",
          "CLIENT_URL=https://PEGAR_DOMINIO_DEL_SITIO",
          "PUBLIC_API_URL=https://PEGAR_URL_DE_LA_API",
          `JWT_ACCESS_SECRET=${secret()}`,
          `JWT_REFRESH_SECRET=${secret()}`,
          `LINK_SECRET=${secret()}`,
          "",
        ].join("\n"),
        { mode: 0o600 },
      );
      console.log(`Secretos escritos en ${out}`);
    }
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
