import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import { cx } from "@/utils/format";
import styles from "./CustomCursor.module.css";

const INTERACTIVE = "a, button, [role='button'], input, select, textarea, label";

/** Aro dorado que sigue al mouse con un leve retraso y se agranda sobre links y botones (solo con mouse). */
export function CustomCursor() {
  const [enabled] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  // Resorte blando: el aro "flota" detrás del puntero en vez de pegarse.
  const ringX = useSpring(x, { stiffness: 160, damping: 22, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 160, damping: 22, mass: 0.6 });

  useEffect(() => {
    if (!enabled) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      setHover(!!(e.target as Element | null)?.closest?.(INTERACTIVE));
    };
    const leave = () => setVisible(false);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;
  return (
    <>
      <motion.div className={cx(styles.cursor, visible && styles.visible)} style={{ x: ringX, y: ringY }} aria-hidden="true">
        <span className={cx(styles.ring, hover && styles.hover)} />
      </motion.div>
      <motion.div className={cx(styles.cursor, visible && styles.visible)} style={{ x, y }} aria-hidden="true">
        <span className={cx(styles.dot, hover && styles.dotHidden)} />
      </motion.div>
    </>
  );
}
