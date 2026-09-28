import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../lib/AppError.js";
import { logger } from "../lib/logger.js";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, `Ruta no encontrada: ${req.method} ${req.path}`, "ROUTE_NOT_FOUND"));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(400).json({ error: { code: "VALIDATION", message: "Datos inválidos", details } });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { code: "BAD_ID", message: `Identificador inválido: ${err.value}` } });
  }
  if (typeof err === "object" && err && "code" in err && (err as { code: number }).code === 11000) {
    const keys = Object.keys((err as { keyValue?: object }).keyValue ?? {}).join(", ");
    return res.status(409).json({ error: { code: "DUPLICATE", message: `Ya existe un registro con ese valor (${keys})` } });
  }
  if (typeof err === "object" && err && "type" in err && (err as { type: string }).type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "BAD_JSON", message: "JSON inválido" } });
  }
  logger.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: "Error interno del servidor" } });
}
