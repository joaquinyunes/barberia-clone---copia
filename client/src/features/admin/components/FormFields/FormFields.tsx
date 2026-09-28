import type { UseFormReturn } from "react-hook-form";
import { Checkbox, Input, Select, Textarea } from "@/components/ui";
import { cx } from "@/utils/format";
import styles from "./FormFields.module.css";

export type { FieldDef } from "./fieldDef";
import type { FieldDef } from "./fieldDef";


/** Renderiza campos a partir de una definición (usado por ResourcePage y formularios del panel). */
export function FormFields({ fields, form }: { fields: FieldDef[]; form: UseFormReturn<Record<string, unknown>> }) {
  const { register, formState } = form;
  const err = (n: string) => (formState.errors[n]?.message as string | undefined) ?? undefined;
  return (
    <div className={styles.grid}>
      {fields.filter((f) => !f.hidden).map((f) => {
        const rules = { required: f.required ? "Campo obligatorio" : false };
        const cls = cx(f.span === 2 && styles.full);
        switch (f.type) {
          case "textarea":
            return <Textarea key={f.name} tone="light" className={cls} label={f.label} hint={f.hint} placeholder={f.placeholder} error={err(f.name)} {...register(f.name, rules)} />;
          case "select":
            return <Select key={f.name} tone="light" className={cls} label={f.label} hint={f.hint} options={f.options ?? []} placeholder={f.required ? undefined : "—"} error={err(f.name)} {...register(f.name, rules)} />;
          case "multiselect":
            return (
              <fieldset key={f.name} className={cx(styles.multi, styles.full)}>
                <legend>{f.label}</legend>
                <div>
                  {(f.options ?? []).map((o) => (
                    <Checkbox key={o.value} tone="light" label={o.label} value={o.value} {...register(f.name)} />
                  ))}
                </div>
                {f.hint && <small>{f.hint}</small>}
              </fieldset>
            );
          case "checkbox":
            return <Checkbox key={f.name} tone="light" className={cx(styles.check, cls)} label={f.label} {...register(f.name)} />;
          case "number":
          case "money":
            return <Input key={f.name} tone="light" className={cls} type="number" step={f.type === "money" ? "1" : "any"} inputMode="decimal" label={f.label} hint={f.hint} placeholder={f.placeholder} error={err(f.name)} {...register(f.name, { ...rules, setValueAs: (v) => (v === "" || v === null ? undefined : Number(v)) })} />;
          case "list":
            return <Input key={f.name} tone="light" className={cls} label={f.label} hint={f.hint ?? "Separado por comas"} placeholder={f.placeholder} {...register(f.name)} />;
          default:
            return <Input key={f.name} tone="light" className={cls} type={f.type ?? "text"} label={f.label} hint={f.hint} placeholder={f.placeholder} error={err(f.name)} {...register(f.name, rules)} />;
        }
      })}
    </div>
  );
}
