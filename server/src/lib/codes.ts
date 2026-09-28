import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para evitar confusiones

export const randomCode = (prefix: string, length = 5) =>
  `${prefix}-${Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;
