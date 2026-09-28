import { motion } from "framer-motion";
import { Fragment, type ElementType } from "react";
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
  stagger = 0.06,
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
  const trigger = inView ? { whileInView: "show", viewport: { once: true, margin: "-40px" } } : { animate: "show" };
  return (
    <Tag className={className}>
      <motion.span className={styles.split} initial="hidden" {...trigger} transition={{ staggerChildren: stagger, delayChildren: delay }}>
        {words.map((w, i) => (
          <Fragment key={`${w}-${i}`}>
            <span className={styles.mask}>
              <motion.span
                className={styles.word}
                variants={{ hidden: { y: "110%", rotate: 4 }, show: { y: "0%", rotate: 0 } }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
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
