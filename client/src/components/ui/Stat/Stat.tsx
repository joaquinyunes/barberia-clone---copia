import type { ReactNode } from "react";
import { cx } from "@/utils/format";
import styles from "./Stat.module.css";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "positive" | "negative" | "warning";
  icon?: ReactNode;
  onClick?: () => void;
}

export const Stat = ({ label, value, hint, tone = "neutral", icon, onClick }: Props) => (
  <div
    className={cx(styles.stat, styles[tone], onClick && styles.clickable)}
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            onClick();
          }
        : undefined
    }
  >
    <div className={styles.top}>
      <span className={styles.label}>{label}</span>
      {icon && <span className={styles.icon}>{icon}</span>}
    </div>
    <div className={styles.value}>{value}</div>
    {hint && <div className={styles.hint}>{hint}</div>}
  </div>
);
