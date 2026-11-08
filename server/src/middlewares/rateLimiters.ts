import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

// En tests no limita, salvo que un test lo pida con RATE_LIMIT_IN_TEST=1 (para probar los propios límites).
const skip = () => env.NODE_ENV === "test" && !process.env.RATE_LIMIT_IN_TEST;

export const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, skip, standardHeaders: true, legacyHeaders: false });
export const publicWriteLimiter = rateLimit({ windowMs: 10 * 60_000, limit: 30, skip, standardHeaders: true, legacyHeaders: false });

const base = { skip, standardHeaders: true, legacyHeaders: false } as const;
/** Mercado Pago reintenta, pero 300 por minuto desde una IP no es tráfico legítimo. */
export const webhookLimiter = rateLimit({ windowMs: 60_000, limit: 300, ...base });
/** Gestión de una reserva con link (ver, cancelar, reprogramar, comprobante): frena el adivinado de links. */
export const bookingLinkLimiter = rateLimit({ windowMs: 10 * 60_000, limit: 60, ...base });
/** Enlaces públicos de lectura (comprobantes, calendario). */
export const publicReadLimiter = rateLimit({ windowMs: 60_000, limit: 120, ...base });
