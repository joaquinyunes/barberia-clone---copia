import { useMemo, useState } from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { addDaysIso, cx, isoDay } from "@/utils/format";
import { DAYS_SHORT } from "@/utils/labels";
import styles from "./DateStrip.module.css";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Tira de 14 días navegable (hasta 60 días hacia adelante). */
export function DateStrip({ value, onChange, closedDays = [] }: { value?: string; onChange: (d: string) => void; closedDays?: number[] }) {
  const [offset, setOffset] = useState(0);
  const today = isoDay();
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDaysIso(today, offset + i)), [today, offset]);
  return (
    <div className={styles.wrap}>
      <button className={styles.nav} onClick={() => setOffset((o) => Math.max(0, o - 7))} disabled={offset === 0} aria-label="Semana anterior"><IoChevronBack /></button>
      <div className={styles.strip}>
        {days.map((d) => {
          const dt = new Date(`${d}T12:00:00-03:00`);
          const wd = dt.getDay();
          const closed = closedDays.includes(wd);
          return (
            <button key={d} disabled={closed} className={cx(styles.day, value === d && styles.active)} onClick={() => onChange(d)} aria-pressed={value === d}>
              <span className={styles.wd}>{d === today ? "Hoy" : DAYS_SHORT[wd]}</span>
              <strong>{dt.getDate()}</strong>
              <span className={styles.month}>{MONTHS[dt.getMonth()]}</span>
            </button>
          );
        })}
      </div>
      <button className={styles.nav} onClick={() => setOffset((o) => Math.min(46, o + 7))} aria-label="Semana siguiente"><IoChevronForward /></button>
    </div>
  );
}
