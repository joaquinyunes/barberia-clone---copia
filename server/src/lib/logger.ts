import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  // Sin datos personales ni credenciales en los logs (Ley 25.326).
  redact: { paths: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']", "req.headers['x-signature']", "*.password", "*.passwordHash", "*.phone", "*.email", "*.totp"], censor: "[oculto]" },
  level: env.NODE_ENV === "test" ? "silent" : "info",
  transport: env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
});
