import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cx } from "@/utils/format";
import styles from "./Motion.module.css";

/**
 * Fondo con parallax: el contenido se desplaza más lento que la página.
 * `strength` es el porcentaje de desplazamiento total (0.12 = ±12 %).
 * Con el scroll con inercia (Lenis) el movimiento ya llega suavizado, sin springs extra.
 */
export function Parallax({ children, strength = 0.12, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${-strength * 100}%`, `${strength * 100}%`]);
  return (
    <div ref={ref} className={cx(styles.parallax, className)}>
      <motion.div className={styles.parallaxInner} style={{ y, top: `${-strength * 100}%`, bottom: `${-strength * 100}%` }}>
        {children}
      </motion.div>
    </div>
  );
}
