import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "./AppError.js";

const ROOT = path.resolve(env.UPLOAD_DIR);
mkdirSync(path.join(ROOT, "receipts"), { recursive: true });

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

/** Tipo real del archivo según sus primeros bytes (no se confía en la extensión). */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  return null;
}

/** Multer en memoria: se valida el contenido antes de escribir a disco. Máx. 5 MB. */
export const uploadReceipt = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export async function saveReceipt(file: Express.Multer.File | undefined) {
  if (!file) throw AppError.badRequest("Adjuntá el comprobante (JPG, PNG, WEBP o PDF)");
  const mime = sniffMime(file.buffer);
  if (!mime || !ALLOWED.has(mime)) throw AppError.badRequest("Formato no permitido. Subí una imagen (JPG, PNG, WEBP) o un PDF.");
  const name = `receipts/${randomUUID()}.${EXT[mime]}`;
  const { writeFile } = await import("node:fs/promises");
  await writeFile(path.join(ROOT, name), file.buffer);
  return { path: name, mime };
}

export async function readStored(relPath: string) {
  const full = path.resolve(ROOT, relPath);
  if (!full.startsWith(ROOT + path.sep)) throw AppError.forbidden();
  return readFile(full);
}
