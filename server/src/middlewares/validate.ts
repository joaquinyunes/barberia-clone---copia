import type { NextFunction, Request, Response } from "express";
import { z, type ZodType } from "zod";
import { AppError } from "../lib/AppError.js";

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/** Valida y reemplaza req.body / req.query / req.params por los datos parseados. */
export const validate =
  (schemas: Schemas) => (req: Request, _res: Response, next: NextFunction) => {
    for (const key of ["body", "query", "params"] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key] ?? {});
      if (!result.success) {
        return next(AppError.badRequest("Datos inválidos", z.flattenError(result.error).fieldErrors));
      }
      // Express 5 define req.query como getter: se reemplaza con defineProperty.
      Object.defineProperty(req, key, { value: result.data, writable: true, configurable: true });
    }
    next();
  };
