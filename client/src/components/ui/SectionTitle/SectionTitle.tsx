import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cx } from "@/utils/format";
import { DURATION, EASE_OUT } from "../Motion/easing";
import { SplitText } from "../Motion/SplitText";
import styles from "./SectionTitle.module.css";

const inView = { initial: "hidden", whileInView: "show", viewport: { once: true, margin: "0px 0px -10% 0px" } } as const;
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

export const SectionTitle = ({ eyebrow, title, subtitle, align = "center" }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; align?: "center" | "left" }) => (
  <header className={cx(styles.wrap, styles[align])}>
    {eyebrow && (
      <motion.span className={styles.eyebrow} {...inView} variants={fadeUp} transition={{ duration: DURATION, ease: EASE_OUT }}>
        {eyebrow}
      </motion.span>
    )}
    {typeof title === "string" ? <SplitText as="h2" className={styles.title} text={title} inView delay={0.1} /> : <h2 className={styles.title}>{title}</h2>}
    <motion.span className={styles.rule} aria-hidden="true" {...inView} variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1 } }} transition={{ duration: 1.6, delay: 0.3, ease: EASE_OUT }} />
    {subtitle && (
      <motion.p className={styles.subtitle} {...inView} variants={fadeUp} transition={{ duration: DURATION, delay: 0.35, ease: EASE_OUT }}>
        {subtitle}
      </motion.p>
    )}
  </header>
);
