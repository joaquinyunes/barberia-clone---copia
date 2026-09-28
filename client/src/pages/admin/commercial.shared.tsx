import { useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { CATEGORY_LABELS } from "@/utils/labels";
import styles from "./admin.module.css";

export interface Allowance { category?: string; service?: string; label?: string; quantity: number }

/** Editor de cupos: "4 cortes + 2 barbas" (por categoría) usado por packs y membresías. */
export function AllowanceEditor({ value, onChange }: { value: Allowance[]; onChange: (v: Allowance[]) => void }) {
  const [draft, setDraft] = useState<Allowance>({ category: "corte", quantity: 1 });
  return (
    <div className={styles.stack}>
      {value.map((a, i) => (
        <div key={i} className={styles.row}>
          <span>{a.quantity} × {a.label ?? CATEGORY_LABELS[a.category ?? ""] ?? a.category}</span>
          <Button size="sm" variant="ghost" onClick={() => onChange(value.filter((_, j) => j !== i))}>Quitar</Button>
        </div>
      ))}
      <div className={styles.row}>
        <Select tone="light" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
        <Input tone="light" type="number" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} aria-label="Cantidad" />
        <Button size="sm" variant="light" onClick={() => onChange([...value, { ...draft, label: CATEGORY_LABELS[draft.category ?? ""]?.split(" ")[0] }])}>+ Agregar</Button>
      </div>
    </div>
  );
}
