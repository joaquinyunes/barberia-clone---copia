import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cx } from "@/utils/format";
import styles from "./Motion.module.css";

const EASE_IN_OUT = [0.77, 0, 0.18, 1] as const;

/** Imagen que se "descubre" con una cortina dorada al entrar en pantalla. */
export function ImageReveal({ children, className, delay = 0, from = "left" }: { children: ReactNode; className?: string; delay?: number; from?: "left" | "bottom" }) {
  const hidden = from === "left" ? "inset(0% 100% 0% 0%)" : "inset(100% 0% 0% 0%)";
  // El observer va en el contenedor sin recortar: un elemento con clip-path al 100 % tiene área visible 0
  // y el IntersectionObserver nunca lo considera "en pantalla".
  return (
    <motion.div className={cx(styles.revealWrap, className)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
      <motion.div className={styles.reveal} variants={{ hidden: { clipPath: hidden }, show: { clipPath: "inset(0% 0% 0% 0%)" } }} transition={{ duration: 1.1, delay, ease: EASE_IN_OUT }}>
        <motion.div className={styles.revealInner} variants={{ hidden: { scale: 1.25 }, show: { scale: 1 } }} transition={{ duration: 1.6, delay, ease: [0.16, 1, 0.3, 1] }}>
          {children}
        </motion.div>
        <motion.span className={styles.curtain} aria-hidden="true" variants={{ hidden: { scaleX: 1 }, show: { scaleX: 0 } }} transition={{ duration: 0.9, delay: delay + 0.35, ease: EASE_IN_OUT }} />
      </motion.div>
    </motion.div>
  );
}
