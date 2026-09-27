import type { ReactNode } from "react";
import { cx } from "@/utils/format";
import styles from "./SectionTitle.module.css";

export const SectionTitle = ({ eyebrow, title, subtitle, align = "center" }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; align?: "center" | "left" }) => (
  <header className={cx(styles.wrap, styles[align])}>
    {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
    <h2 className={styles.title}>{title}</h2>
    <span className={styles.rule} aria-hidden="true" />
    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
  </header>
);
