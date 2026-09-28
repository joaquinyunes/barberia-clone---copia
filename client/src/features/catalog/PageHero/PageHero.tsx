import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Img, Parallax, SplitText } from "@/components/ui";
import styles from "./PageHero.module.css";

const EASE = [0.16, 1, 0.3, 1] as const;

export const PageHero = ({ eyebrow, title, text, image, children }: { eyebrow?: string; title: ReactNode; text?: ReactNode; image?: string; children?: ReactNode }) => (
  <section className={styles.hero}>
    {image && (
      <Parallax strength={0.18}>
        <motion.div className={styles.zoom} initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 2.2, ease: EASE }}>
          <Img src={image} alt="" loading="eager" />
        </motion.div>
      </Parallax>
    )}
    <div className={styles.overlay} />
    <div className={styles.content}>
      {eyebrow && (
        <motion.span className={styles.eyebrow} initial={{ opacity: 0, letterSpacing: "0.6em" }} animate={{ opacity: 1, letterSpacing: "0.3em" }} transition={{ duration: 1, ease: EASE }}>
          {eyebrow}
        </motion.span>
      )}
      {typeof title === "string" ? <SplitText as="h1" text={title} delay={0.15} /> : <h1>{title}</h1>}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.5, ease: EASE }}>
        {text && <p>{text}</p>}
        {children}
      </motion.div>
    </div>
  </section>
);
