import type { ReactNode } from "react";
import { Img } from "@/components/ui";
import styles from "./PageHero.module.css";

export const PageHero = ({ eyebrow, title, text, image, children }: { eyebrow?: string; title: ReactNode; text?: ReactNode; image?: string; children?: ReactNode }) => (
  <section className={styles.hero}>
    {image && <div className={styles.bg}><Img src={image} alt="" /></div>}
    <div className={styles.overlay} />
    <div className={styles.content}>
      {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
      <h1>{title}</h1>
      {text && <p>{text}</p>}
      {children}
    </div>
  </section>
);
