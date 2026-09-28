import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cx } from "@/utils/format";
import { SplitText } from "../Motion/SplitText";
import styles from "./SectionTitle.module.css";

const EASE = [0.16, 1, 0.3, 1] as const;
const inView = { initial: "hidden", whileInView: "show", viewport: { once: true, margin: "-60px" } } as const;

export const SectionTitle = ({ eyebrow, title, subtitle, align = "center" }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; align?: "center" | "left" }) => (
  <header className={cx(styles.wrap, styles[align])}>
    {eyebrow && (
      <motion.span className={styles.eyebrow} {...inView} variants={{ hidden: { opacity: 0, letterSpacing: "0.6em" }, show: { opacity: 1, letterSpacing: "0.3em" } }} transition={{ duration: 1, ease: EASE }}>
        {eyebrow}
      </motion.span>
    )}
    {typeof title === "string" ? <SplitText as="h2" className={styles.title} text={title} inView delay={0.1} /> : <h2 className={styles.title}>{title}</h2>}
    <motion.span className={styles.rule} aria-hidden="true" {...inView} variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1 } }} transition={{ duration: 0.9, delay: 0.35, ease: EASE }} />
    {subtitle && (
      <motion.p className={styles.subtitle} {...inView} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.8, delay: 0.45, ease: EASE }}>
        {subtitle}
      </motion.p>
    )}
  </header>
);
