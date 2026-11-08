import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/AppError.js";

/** Busca claves con "$" (operadores de Mongo) o "." (rutas anidadas) en cualquier nivel. */
function hasOperator(value: unknown, depth = 0): boolean {
  if (depth > 12) return true; // anidado absurdo: se rechaza
  if (Array.isArray(value)) return value.some((v) => hasOperator(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.entries(value).some(([k, v]) => k.startsWith("$") || k.includes(".") || hasOperator(v, depth + 1));
  }
  return false;
}

/**
 * S5 — Defensa contra NoSQL injection: ningún body ni query puede traer operadores ($ne, $gt, $where…).
 * Ningún campo legítimo de este sistema lleva "$" ni "." en su nombre.
 * Excepción: `data.id` de Mercado Pago llega como clave de query con punto.
 */
export function rejectMongoOperators(req: Request, _res: Response, next: NextFunction) {
  const query = Object.fromEntries(Object.entries(req.query).filter(([k]) => k !== "data.id"));
  if (hasOperator(req.body) || hasOperator(query)) return next(AppError.badRequest("Solicitud inválida"));
  next();
}
