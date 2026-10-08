import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cx } from "@/utils/format";
import { EASE_IN_OUT, EASE_OUT } from "./easing";
import styles from "./Motion.module.css";

/** Imagen que se descubre con una máscara mientras la foto se aleja lentamente (zoom-out). */
export function ImageReveal({ children, className, delay = 0, from = "bottom" }: { children: ReactNode; className?: string; delay?: number; from?: "left" | "bottom" }) {
  const hidden = from === "left" ? "inset(0% 100% 0% 0%)" : "inset(100% 0% 0% 0%)";
  // El observer va en el contenedor sin recortar: un elemento con clip-path al 100 % tiene área visible 0
  // y el IntersectionObserver nunca lo considera "en pantalla".
  return (
    <motion.div className={cx(styles.revealWrap, className)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "0px 0px -10% 0px" }}>
      <motion.div className={styles.reveal} variants={{ hidden: { clipPath: hidden }, show: { clipPath: "inset(0% 0% 0% 0%)" } }} transition={{ duration: 1.6, delay, ease: EASE_IN_OUT }}>
        <motion.div className={styles.revealInner} variants={{ hidden: { scale: 1.2 }, show: { scale: 1 } }} transition={{ duration: 2.2, delay, ease: EASE_OUT }}>
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
