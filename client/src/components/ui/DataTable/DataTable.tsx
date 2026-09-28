import type { ReactNode } from "react";
import { cx } from "@/utils/format";
import { Skeleton } from "../Skeleton/Skeleton";
import styles from "./DataTable.module.css";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  hideOnMobile?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  loading?: boolean;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  footer?: ReactNode;
}

export function DataTable<T>({ columns, rows, loading, rowKey, onRowClick, empty = "Sin registros", footer }: Props<T>) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: c.align, width: c.width }} className={cx(c.hideOnMobile && styles.hideMobile)}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 5 }, (_, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className={cx(c.hideOnMobile && styles.hideMobile)}><Skeleton /></td>
                ))}
              </tr>
            ))}
          {!loading && rows?.length === 0 && (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>{empty}</td>
            </tr>
          )}
          {!loading &&
            rows?.map((row) => (
              <tr key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cx(onRowClick && styles.clickable)}>
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align }} className={cx(c.hideOnMobile && styles.hideMobile)}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
        </tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  );
}
