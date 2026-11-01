import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

/** `as="h1"` cuando el estado vacío es todo el contenido de la página (se ve igual que el párrafo). */
export const EmptyState = ({ icon, title, as: Title = "p", children }: { icon?: ReactNode; title: string; as?: "p" | "h1" | "h2"; children?: ReactNode }) => (
  <div className={styles.empty}>
    {icon && <div className={styles.icon}>{icon}</div>}
    <Title className={styles.title}>{title}</Title>
    {children && <div className={styles.body}>{children}</div>}
  </div>
);
