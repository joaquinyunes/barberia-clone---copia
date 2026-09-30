import { motion } from "framer-motion";
import { Fragment, type ElementType } from "react";
import { EASE_OUT } from "./easing";
import styles from "./Motion.module.css";

/**
 * Título que aparece palabra por palabra, cada una subiendo desde una máscara
 * (el efecto de los titulares grandes del sitio de referencia).
 */
export function SplitText({
  text,
  as: Tag = "span",
  className,
  delay = 0,
  stagger = 0.045,
  inView = false,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  stagger?: number;
  /** true: se anima al entrar en pantalla; false: al montarse. */
  inView?: boolean;
}) {
  const words = text.split(" ");
  const trigger = inView ? { whileInView: "show", viewport: { once: true, margin: "0px 0px -10% 0px" } } : { animate: "show" };
  return (
    <Tag className={className}>
      <motion.span className={styles.split} initial="hidden" {...trigger} transition={{ staggerChildren: stagger, delayChildren: delay }}>
        {words.map((w, i) => (
          <Fragment key={`${w}-${i}`}>
            <span className={styles.mask}>
              <motion.span
                className={styles.word}
                variants={{ hidden: { y: "105%", opacity: 0 }, show: { y: "0%", opacity: 1 } }}
                transition={{ y: { duration: 1.4, ease: EASE_OUT }, opacity: { duration: 0.8, ease: "linear" } }}
              >
                {w}
              </motion.span>
            </span>
            {i < words.length - 1 && " "}
          </Fragment>
        ))}
      </motion.span>
    </Tag>
  );
}
