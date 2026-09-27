import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) => (
  <header className={styles.header}>
    <title>{`${title} · Panel Jack el Barbero`}</title>
    <div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </header>
);
