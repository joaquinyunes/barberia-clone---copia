import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";
import styles from "./Drawer.module.css";

export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={title}>
        <header className={styles.header}>
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Cerrar"><IoClose size={24} /></button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}
