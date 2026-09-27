import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const skip = () => env.NODE_ENV === "test";

export const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, skip, standardHeaders: true, legacyHeaders: false });
export const publicWriteLimiter = rateLimit({ windowMs: 10 * 60_000, limit: 30, skip, standardHeaders: true, legacyHeaders: false });
