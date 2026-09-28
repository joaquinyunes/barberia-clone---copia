import { AnimatePresence, motion } from "framer-motion";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { Button, Img } from "@/components/ui";
import { cx } from "@/utils/format";
import { HERO_SLIDES } from "./slides";
import { useSlider } from "./useSlider";
import styles from "./HeroSlider.module.css";

export function HeroSlider() {
  const { index, setIndex, next, prev, pause, resume } = useSlider(HERO_SLIDES.length);
  const slide = HERO_SLIDES[index];
  return (
    <section className={styles.hero} onMouseEnter={pause} onMouseLeave={resume} aria-roledescription="carrusel" aria-label="Destacados">
      <AnimatePresence mode="sync">
        <motion.div key={slide.id} className={styles.bg} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.1 }}>
          <Img src={slide.image} alt="" />
        </motion.div>
      </AnimatePresence>
      <div className={styles.overlay} />
      <div className={styles.content}>
        <AnimatePresence mode="wait">
          <motion.div key={slide.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6 }}>
            <span className={styles.eyebrow}>{slide.eyebrow}</span>
            <h1 className={styles.title}>{slide.title}</h1>
            <p className={styles.text}>{slide.text}</p>
            <div className={styles.ctas}>
              <Button to={slide.cta.to} size="lg">{slide.cta.label}</Button>
              <Button to={slide.secondary.to} size="lg" variant="outline">{slide.secondary.label}</Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <button className={cx(styles.arrow, styles.prev)} onClick={prev} aria-label="Anterior"><IoChevronBack size={26} /></button>
      <button className={cx(styles.arrow, styles.next)} onClick={next} aria-label="Siguiente"><IoChevronForward size={26} /></button>
      <div className={styles.dots}>
        {HERO_SLIDES.map((s, i) => (
          <button key={s.id} className={cx(styles.dot, i === index && styles.dotActive)} onClick={() => setIndex(i)} aria-label={`Ir a ${s.title}`} aria-current={i === index} />
        ))}
      </div>
      <div className={styles.scroll} aria-hidden="true"><span /></div>
    </section>
  );
}
