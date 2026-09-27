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
});

const parsed = schema.safeParse(
  Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== "")),
);
if (!parsed.success) {
  console.error("Variables de entorno inválidas:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;

if (env.NODE_ENV === "production") {
  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "LINK_SECRET"] as const) {
    if (env[key].startsWith(DEV_SECRET)) {
      throw new Error(`${key} debe configurarse en producción`);
    }
  }
}
