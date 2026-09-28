import { cx } from "@/utils/format";
import styles from "./Tabs.module.css";

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={t.value === value} className={cx(styles.tab, t.value === value && styles.active)} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count !== undefined && <span className={styles.count}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
