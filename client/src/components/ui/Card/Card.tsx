import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/utils/format";
import styles from "./Card.module.css";

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: "dark" | "light";
  title?: ReactNode;
  actions?: ReactNode;
  padded?: boolean;
}

export const Card = ({ tone = "dark", title, actions, padded = true, className, children, ...rest }: Props) => (
  <div className={cx(styles.card, styles[tone], padded && styles.padded, className)} {...rest}>
    {(title || actions) && (
      <div className={styles.head}>
        {title && <h3 className={styles.title}>{title}</h3>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    )}
    {children}
  </div>
);
