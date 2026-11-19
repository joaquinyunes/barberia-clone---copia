import "dotenv/config";
import { z } from "zod";

const DEV_SECRET = "dev-secret-cambiar-en-produccion";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  MONGO_URI: z.string().default("mongodb://127.0.0.1:27017/jack-el-barbero"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  PUBLIC_API_URL: z.string().default("http://localhost:4000"),
  JWT_ACCESS_SECRET: z.string().min(16).default(`${DEV_SECRET}-access`),
  JWT_REFRESH_SECRET: z.string().min(16).default(`${DEV_SECRET}-refresh`),
  LINK_SECRET: z.string().min(16).default(`${DEV_SECRET}-link`),
  UPLOAD_DIR: z.string().default("uploads"),
  BUSINESS_UTC_OFFSET: z.string().regex(/^[+-]\d{2}:\d{2}$/).default("-03:00"),
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),
  /** Dónde se guardan los comprobantes: `mongo` (persistente, por defecto en producción) o `disk` (carpeta local; en Render se pierde en cada deploy). */
  STORAGE_DRIVER: z.enum(["disk", "mongo"]).optional(),
  /** Clave propia (32+ caracteres) para cifrar los secretos de 2FA; si falta se deriva de JWT_REFRESH_SECRET. Rotar los JWT no debería invalidar el 2FA: cargarla en producción. */
  TOTP_ENC_KEY: z.string().min(32).optional(),
  /** Obliga a administradores y encargados a activar la verificación en dos pasos (por defecto, sí en producción). */
  REQUIRE_STAFF_2FA: z.enum(["true", "false"]).optional().transform((v) => (v === undefined ? undefined : v === "true")),
  /** Opcional: URL de un webhook (Slack, Discord, Better Stack…) que recibe los errores 500. */
  ERROR_WEBHOOK_URL: z.string().url().optional(),
  /** Proveedor de factura electrónica: none (comprobante interno) | otro, ver modules/billing. */
  FACTURACION_PROVIDER: z.string().default("none"),
});

const raw: Record<string, string | undefined> = Object.fromEntries(
  Object.entries(process.env).filter(([, v]) => v !== ""),
);
// Render define RENDER_EXTERNAL_URL solo: sirve de PUBLIC_API_URL si no se configuró.
raw.PUBLIC_API_URL ??= raw.RENDER_EXTERNAL_URL;

const parsed = schema.safeParse(raw);
if (!parsed.success) {
  console.error("Variables de entorno inválidas:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = {
  ...parsed.data,
  REQUIRE_STAFF_2FA: parsed.data.REQUIRE_STAFF_2FA ?? parsed.data.NODE_ENV === "production",
  STORAGE_DRIVER: (parsed.data.STORAGE_DRIVER ?? (parsed.data.NODE_ENV === "production" ? "mongo" : "disk")) as "disk" | "mongo",
};

if (env.NODE_ENV === "production") {
  // Los valores por defecto (localhost, secretos de desarrollo) son solo para desarrollo y tests.
  for (const key of ["MONGO_URI", "CLIENT_URL", "PUBLIC_API_URL"] as const) {
    if (!raw[key]) throw new Error(`${key} debe configurarse en producción`);
  }
  if (new Set([env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET, env.LINK_SECRET]).size < 3) throw new Error("JWT_ACCESS_SECRET, JWT_REFRESH_SECRET y LINK_SECRET deben ser distintos entre sí");
  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "LINK_SECRET"] as const) {
    if (env[key].startsWith(DEV_SECRET)) {
      throw new Error(`${key} debe configurarse en producción`);
    }
  }
}
