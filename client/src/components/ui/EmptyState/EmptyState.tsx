import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export const EmptyState = ({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) => (
  <div className={styles.empty}>
    {icon && <div className={styles.icon}>{icon}</div>}
    <p className={styles.title}>{title}</p>
    {children && <div className={styles.body}>{children}</div>}
  </div>
);
