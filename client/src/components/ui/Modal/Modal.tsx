import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IoClose } from "react-icons/io5";
import { cx } from "@/utils/format";
import styles from "./Modal.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  tone?: "dark" | "light";
}

export function Modal({ open, onClose, title, children, footer, size = "md", tone = "light" }: Props) {
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
      <div className={cx(styles.modal, styles[size], styles[tone])} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.close} onClick={onClose} aria-label="Cerrar"><IoClose size={22} /></button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
