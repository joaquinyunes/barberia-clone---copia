import type { CSSProperties, ReactNode } from "react";
import { IoCheckmarkCircle } from "react-icons/io5";
import { Img } from "@/components/ui";
import { cx } from "@/utils/format";
import styles from "./StepPicker.module.css";

export interface PickerOption {
  id: string;
  title: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
  image?: string;
  badge?: string;
}

/** Lista de opciones grandes y táctiles (sede, servicio, barbero). */
export function StepPicker({ options, value, onChange, columns = 2 }: { options: PickerOption[]; value?: string; onChange: (id: string) => void; columns?: 1 | 2 | 3 }) {
  return (
    <div className={cx(styles.grid, styles[`c${columns}`])}>
      {options.map((o, i) => (
        <button key={o.id} className={cx(styles.option, value === o.id && styles.active)} style={{ "--i": Math.min(i, 8) } as CSSProperties} onClick={() => onChange(o.id)} aria-pressed={value === o.id}>
          {o.image !== undefined && <div className={styles.thumb}><Img src={o.image} alt={o.title} /></div>}
          <div className={styles.text}>
            <strong>{o.title}{o.badge && <span className={styles.badge}>{o.badge}</span>}</strong>
            {o.subtitle && <span>{o.subtitle}</span>}
          </div>
          {o.aside && <div className={styles.aside}>{o.aside}</div>}
          {value === o.id && <IoCheckmarkCircle className={styles.check} size={22} />}
        </button>
      ))}
    </div>
  );
}
