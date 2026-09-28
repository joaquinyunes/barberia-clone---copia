import { cx, money, signedMoney } from "@/utils/format";
import styles from "./Money.module.css";

/** Monto con color: verde si es a favor, rojo si es deuda (convención del banco interno). */
export const Money = ({ value, signed, colored = true, strong }: { value: number; signed?: boolean; colored?: boolean; strong?: boolean }) => (
  <span className={cx(styles.money, colored && value > 0 && styles.pos, colored && value < 0 && styles.neg, strong && styles.strong)}>
    {signed ? signedMoney(value) : money(value)}
  </span>
);
