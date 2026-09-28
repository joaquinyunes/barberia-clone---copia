import { motion, useScroll, useSpring } from "framer-motion";
import styles from "./ScrollProgress.module.css";

/** Línea dorada arriba de todo que indica cuánto se leyó de la página. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 });
  return <motion.div className={styles.bar} style={{ scaleX }} aria-hidden="true" />;
}
