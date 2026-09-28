import { EmptyState, Skeleton } from "@/components/ui";
import { cx } from "@/utils/format";
import styles from "./TimeSlots.module.css";

const groups = [
  { label: "Mañana", test: (t: string) => t < "12:00" },
  { label: "Tarde", test: (t: string) => t >= "12:00" && t < "18:00" },
  { label: "Noche", test: (t: string) => t >= "18:00" },
];

export function TimeSlots({ slots, value, onChange, loading, closed }: { slots?: string[]; value?: string; onChange: (t: string) => void; loading?: boolean; closed?: boolean }) {
  if (loading) return <div className={styles.grid}>{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} height={42} />)}</div>;
  if (closed) return <EmptyState title="La sede está cerrada ese día">Elegí otra fecha.</EmptyState>;
  if (!slots?.length) return <EmptyState title="No quedan horarios ese día">Probá con otra fecha o con “cualquier barbero”.</EmptyState>;
  return (
    <div className={styles.groups}>
      {groups.map((g) => {
        const list = slots.filter(g.test);
        if (!list.length) return null;
        return (
          <div key={g.label}>
            <h4 className={styles.label}>{g.label}</h4>
            <div className={styles.grid}>
              {list.map((t) => (
                <button key={t} className={cx(styles.slot, value === t && styles.active)} onClick={() => onChange(t)} aria-pressed={value === t}>{t}</button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
