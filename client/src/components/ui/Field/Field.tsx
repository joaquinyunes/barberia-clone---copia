import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "@/utils/format";
import styles from "./Field.module.css";

interface Wrap {
  label?: string;
  error?: string;
  hint?: ReactNode;
  tone?: "dark" | "light";
  className?: string;
}

const Wrapper = ({ id, label, error, hint, tone = "dark", className, children }: Wrap & { id: string; children: ReactNode }) => (
  <div className={cx(styles.field, styles[tone], className)}>
    {label && <label htmlFor={id} className={styles.label}>{label}</label>}
    {children}
    {error ? <span className={styles.error} role="alert">{error}</span> : hint ? <span className={styles.hint}>{hint}</span> : null}
  </div>
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Wrap>(function Input(
  { label, error, hint, tone, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Wrapper id={fid} label={label} error={error} hint={hint} tone={tone} className={className}>
      <input ref={ref} id={fid} className={cx(styles.control, error && styles.invalid)} aria-invalid={!!error} {...rest} />
    </Wrapper>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Wrap & { options: { value: string; label: string }[]; placeholder?: string }>(
  function Select({ label, error, hint, tone, className, id, options, placeholder, ...rest }, ref) {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <Wrapper id={fid} label={label} error={error} hint={hint} tone={tone} className={className}>
        <select ref={ref} id={fid} className={cx(styles.control, error && styles.invalid)} aria-invalid={!!error} {...rest}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Wrapper>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Wrap>(function Textarea(
  { label, error, hint, tone, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Wrapper id={fid} label={label} error={error} hint={hint} tone={tone} className={className}>
      <textarea ref={ref} id={fid} className={cx(styles.control, styles.textarea, error && styles.invalid)} aria-invalid={!!error} {...rest} />
    </Wrapper>
  );
});

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; tone?: "dark" | "light" }>(function Checkbox(
  { label, tone = "dark", className, ...rest },
  ref,
) {
  return (
    <label className={cx(styles.check, styles[tone], className)}>
      <input ref={ref} type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
});
