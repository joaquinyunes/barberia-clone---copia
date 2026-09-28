import type { ReactNode } from "react";
import { cx } from "@/utils/format";
import styles from "./Badge.module.css";

export type Tone = "neutral" | "warning" | "info" | "success" | "danger" | "gold";

export const Badge = ({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) => (
  <span className={cx(styles.badge, styles[tone])}>{children}</span>
);
