import { cx } from "@/utils/format";
import { useToastStore } from "./toastStore";
import styles from "./Toast.module.css";

export function Toaster() {
  const { items, dismiss } = useToastStore();
  return (
    <div className={styles.region} aria-live="polite">
      {items.map((t) => (
        <button key={t.id} className={cx(styles.toast, styles[t.tone])} onClick={() => dismiss(t.id)}>
          {t.message}
        </button>
      ))}
    </div>
  );
}
