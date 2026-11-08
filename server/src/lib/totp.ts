import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32(buf: Buffer) {
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  return (bits.match(/.{1,5}/g) ?? []).map((c) => ALPHABET[parseInt(c.padEnd(5, "0"), 2)]).join("");
}
function fromBase32(s: string) {
  const bits = [...s.toUpperCase().replace(/=+$/, "")].map((c) => ALPHABET.indexOf(c).toString(2).padStart(5, "0")).join("");
  return Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
}

/** Código TOTP de 6 dígitos (RFC 6238, SHA-1, 30 s) para el paso de tiempo indicado. */
export function totpCode(secret: string, step: number) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", fromBase32(secret)).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

export const newSecret = () => base32(randomBytes(20));

/** Acepta el código actual y ±1 paso (reloj desfasado). */
export function verifyTotp(secret: string, token: string, now = Date.now()) {
  const step = Math.floor(now / 30_000);
  const given = Buffer.from(token.replace(/\s/g, ""));
  return [-1, 0, 1].some((d) => {
    const want = Buffer.from(totpCode(secret, step + d));
    return want.length === given.length && timingSafeEqual(want, given);
  });
}

export const otpauthUrl = (secret: string, account: string) =>
  `otpauth://totp/${encodeURIComponent(`Jack el Barbero:${account}`)}?secret=${secret}&issuer=${encodeURIComponent("Jack el Barbero")}&algorithm=SHA1&digits=6&period=30`;

/** El secreto TOTP se guarda cifrado (AES-256-GCM) con una clave derivada de JWT_REFRESH_SECRET: un volcado de la base solo no alcanza. */
const key = () => createHash("sha256").update(`totp:${env.JWT_REFRESH_SECRET}`).digest();
export function sealSecret(secret: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(secret, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}
export function openSecret(sealed: string) {
  const [iv, tag, enc] = sealed.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
