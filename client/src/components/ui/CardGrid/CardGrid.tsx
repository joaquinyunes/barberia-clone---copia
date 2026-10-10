import type { ReactNode } from "react";
import { cx } from "@/utils/format";
import styles from "./CardGrid.module.css";

/** Grilla de tarjetas: cuántas columnas se ven lo decide el CSS del que la usa con `--cols` y `--gap`. */
export function CardGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.grid, className)}>{children}</div>;
}
