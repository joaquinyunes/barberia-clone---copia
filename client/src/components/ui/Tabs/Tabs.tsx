import { useId } from "react";
import { motion } from "framer-motion";
import { cx } from "@/utils/format";
import styles from "./Tabs.module.css";

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  const id = useId(); // si hay varias barras en pantalla, cada una desliza su propio indicador
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={t.value === value} className={cx(styles.tab, t.value === value && styles.active)} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count !== undefined && <span className={styles.count}>{t.count}</span>}
          {t.value === value && <motion.span className={styles.indicator} layoutId={`tab-${id}`} transition={{ type: "spring", stiffness: 520, damping: 42 }} />}
        </button>
      ))}
    </div>
  );
}
