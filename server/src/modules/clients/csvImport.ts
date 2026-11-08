import { Client, normalizePhone } from "./client.model.js";

/** CSV simple (RFC 4180 básico): comillas dobles, comas o punto y coma, saltos de línea CRLF/LF. */
export function parseCsv(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) (row.push(cell), (cell = ""));
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

const HEADERS: Record<string, "name" | "phone" | "email"> = { nombre: "name", name: "name", cliente: "name", telefono: "phone", teléfono: "phone", celular: "phone", phone: "phone", whatsapp: "phone", email: "email", mail: "email", correo: "email" };

/**
 * Importa clientes de otra herramienta (columnas: nombre, teléfono, email). Los que ya existen por teléfono se saltan
 * (no se pisan datos), las filas inválidas se informan con su número. No importa consentimiento de campañas: nadie queda
 * con «acepta promociones» por venir de otro sistema.
 */
export async function importClients(csv: string) {
  const rows = parseCsv(csv.replace(/^\uFEFF/, ""));
  if (rows.length < 2) return { created: 0, skipped: 0, invalid: [{ line: 1, reason: "El archivo necesita una fila de títulos y al menos un cliente" }] };
  const cols = rows[0].map((h) => HEADERS[h.trim().toLowerCase()]);
  if (!cols.includes("name") || !cols.includes("phone")) return { created: 0, skipped: 0, invalid: [{ line: 1, reason: "Faltan las columnas «nombre» y «teléfono»" }] };
  let created = 0;
  let skipped = 0;
  const invalid: { line: number; reason: string }[] = [];
  for (const [i, r] of rows.slice(1).entries()) {
    const rec: Record<string, string> = {};
    cols.forEach((c, k) => c && (rec[c] = (r[k] ?? "").trim()));
    const digits = (rec.phone ?? "").replace(/\D/g, "");
    if ((rec.name ?? "").length < 2) invalid.push({ line: i + 2, reason: "Falta el nombre" });
    else if (digits.length < 8 || digits.length > 15) invalid.push({ line: i + 2, reason: "Teléfono inválido" });
    else if (rec.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rec.email)) invalid.push({ line: i + 2, reason: "Email inválido" });
    else {
      const phone = normalizePhone(rec.phone);
      if (await Client.exists({ phone })) skipped++;
      else {
        await Client.create({ name: rec.name, phone, email: rec.email || undefined, source: "importado" });
        created++;
      }
    }
    if (rows.length > 5001) break;
  }
  return { created, skipped, invalid: invalid.slice(0, 50) };
}
