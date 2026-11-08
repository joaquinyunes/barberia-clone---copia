import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { rejectMongoOperators } from "./middlewares/sanitize.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { api } from "./routes/index.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  // Permissions-Policy: la API no necesita ningún permiso del navegador.
  app.use((_req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    next();
  });
  app.use(cors({ origin: env.CLIENT_URL.split(","), credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(rejectMongoOperators);
  // Los links de reserva llevan el token en la query (?token=…): no se registra la query ni cabeceras.
  if (env.NODE_ENV !== "test") app.use(pinoHttp({ logger, serializers: { req: (req: { method: string; url: string }) => ({ method: req.method, url: req.url.split("?")[0] }), res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }) }, autoLogging: { ignore: (req) => req.url === "/api/v1/health" } }));
  app.use("/api/v1", api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
