import { GiRazor } from "react-icons/gi";
import { cx } from "@/utils/format";
import styles from "./Motion.module.css";

/** Cinta de texto infinita (se duplica el contenido para que el loop no tenga cortes). */
export function Marquee({ items, reverse, tone = "gold", speed = 38 }: { items: string[]; reverse?: boolean; tone?: "gold" | "outline"; speed?: number }) {
  const row = (hidden?: boolean) => (
    <div className={styles.marqueeRow} aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <span key={`${t}-${i}`} className={styles.marqueeItem}>
          {t}
          <GiRazor className={styles.marqueeIcon} />
        </span>
      ))}
    </div>
  );
  return (
    <div className={cx(styles.marquee, styles[tone])}>
      <div className={cx(styles.marqueeTrack, reverse && styles.marqueeReverse)} style={{ animationDuration: `${speed}s` }}>
        {row()}
        {row(true)}
      </div>
    </div>
  );
}
