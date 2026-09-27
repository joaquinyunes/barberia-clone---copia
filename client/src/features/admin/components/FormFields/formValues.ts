import type { FieldDef } from "./fieldDef";

/** Convierte valores del formulario al payload de la API (listas, vacíos, multiselect). */
export function toPayload(fields: FieldDef[], values: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    let v = values[f.name];
    if (f.type === "list") v = typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : v;
    if (f.type === "multiselect") v = Array.isArray(v) ? v : v ? [v] : [];
    if (f.type === "select" && v === "") v = f.required ? undefined : null;
    if ((f.type === "text" || f.type === "email" || f.type === "tel" || f.type === "textarea" || f.type === "date" || f.type === "time" || !f.type) && v === "") v = undefined;
    if ((f.type === "number" || f.type === "money") && (v === undefined || Number.isNaN(v))) v = undefined;
    if (v !== undefined) out[f.name] = v;
  }
  return out;
}

/** Valores iniciales del formulario a partir de un registro existente. */
export function toFormValues(fields: FieldDef[], row?: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    let v = row?.[f.name];
    if (v && typeof v === "object" && !Array.isArray(v) && "_id" in (v as object)) v = (v as { _id: string })._id;
    if (Array.isArray(v) && f.type === "multiselect") v = v.map((x) => (typeof x === "object" && x ? (x as { _id: string })._id : String(x)));
    if (Array.isArray(v) && f.type === "list") v = v.join(", ");
    if (f.type === "date" && typeof v === "string") v = v.slice(0, 10);
    out[f.name] = v ?? (f.type === "checkbox" ? false : f.type === "multiselect" ? [] : "");
  }
  return out;
}
