import type { HTMLAttributes } from "react";
import { cx } from "@/utils/format";
import styles from "./Container.module.css";

export const Container = ({ className, narrow, ...rest }: HTMLAttributes<HTMLDivElement> & { narrow?: boolean }) => (
  <div className={cx(styles.container, narrow && styles.narrow, className)} {...rest} />
);

export const Section = ({ className, tone = "base", ...rest }: HTMLAttributes<HTMLElement> & { tone?: "base" | "soft" | "surface" }) => (
  <section className={cx(styles.section, styles[tone], className)} {...rest} />
);
