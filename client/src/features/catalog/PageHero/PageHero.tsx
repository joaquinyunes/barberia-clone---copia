import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Img, Parallax, SplitText } from "@/components/ui";
import { DURATION, EASE_OUT } from "@/components/ui/Motion/easing";
import styles from "./PageHero.module.css";

export const PageHero = ({ eyebrow, title, text, image, children }: { eyebrow?: string; title: ReactNode; text?: ReactNode; image?: string; children?: ReactNode }) => (
  <section className={styles.hero}>
    {image && (
      <Parallax strength={0.15}>
        <motion.div className={styles.zoom} initial={{ scale: 1.12, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ scale: { duration: 2.6, ease: EASE_OUT }, opacity: { duration: 1.2 } }}>
          <Img src={image} alt="" loading="eager" />
        </motion.div>
      </Parallax>
    )}
    <div className={styles.overlay} />
    <div className={styles.content}>
      {eyebrow && (
        <motion.span className={styles.eyebrow} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DURATION, delay: 0.1, ease: EASE_OUT }}>
          {eyebrow}
        </motion.span>
      )}
      {typeof title === "string" ? <SplitText as="h1" text={title} delay={0.2} /> : <h1>{title}</h1>}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DURATION, delay: 0.55, ease: EASE_OUT }}>
        {text && <p>{text}</p>}
        {children}
      </motion.div>
    </div>
  </section>
);
