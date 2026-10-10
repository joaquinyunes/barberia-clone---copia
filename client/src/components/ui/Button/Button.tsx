import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cx } from "@/utils/format";
import { Spinner } from "../Spinner/Spinner";
import styles from "./Button.module.css";

type Variant = "gold" | "outline" | "ghost" | "dark" | "danger" | "whatsapp" | "light";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
  to?: string;
  href?: string;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "gold", size = "md", loading, icon, block, to, href, className, children, disabled, ...rest },
  ref,
) {
  const classes = cx(styles.btn, styles[variant], styles[size], block && styles.block, className);
  const content = (
    <>
      {loading ? <Spinner size={16} /> : icon}
      {children && <span data-pump="center">{children}</span>}
    </>
  );
  if (to) return <Link to={to} className={classes}>{content}</Link>;
  if (href) return <a href={href} className={classes} target="_blank" rel="noopener noreferrer">{content}</a>;
  return (
    <button ref={ref} className={classes} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
});
