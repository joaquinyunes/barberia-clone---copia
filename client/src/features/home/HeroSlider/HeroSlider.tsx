import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { INTRO_DELAY } from "@/components/layout/Preloader/intro";
import { Button, Img, SplitText } from "@/components/ui";
import { cx } from "@/utils/format";
import { HERO_SLIDES } from "./slides";
import { useSlider } from "./useSlider";
import styles from "./HeroSlider.module.css";

const INTERVAL = 7000;
const EASE = [0.16, 1, 0.3, 1] as const;
const pad = (n: number) => String(n).padStart(2, "0");

export function HeroSlider() {
  const { index, setIndex, next, prev, paused, pause, resume } = useSlider(HERO_SLIDES.length, INTERVAL);
  const slide = HERO_SLIDES[index];

  // La primera diapositiva espera a que termine el preloader; las siguientes entran enseguida.
  const firstRun = useRef(true);
  useEffect(() => {
    if (index !== 0) firstRun.current = false;
  }, [index]);
  const d = firstRun.current ? INTRO_DELAY : 0.15;

  // Parallax al hacer scroll: la foto baja más lento y el texto se desvanece.
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className={styles.hero} onMouseEnter={pause} onMouseLeave={resume} aria-roledescription="carrusel" aria-label="Destacados">
      <motion.div className={styles.bgWrap} style={{ y: bgY }}>
        <AnimatePresence initial={false}>
          <motion.div key={slide.id} className={styles.bg} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.4, ease: "easeInOut" }}>
            {/* Ken Burns: zoom lento mientras dura la diapositiva */}
            <motion.div className={styles.kenburns} initial={{ scale: 1.18 }} animate={{ scale: 1.02 }} transition={{ duration: INTERVAL / 1000 + 2, ease: "linear" }}>
              <Img src={slide.image} alt="" loading="eager" fetchPriority="high" />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <div className={styles.overlay} />
      <div className={styles.grain} aria-hidden="true" />

      <motion.div className={styles.content} style={{ y: contentY, opacity: contentOpacity }}>
        <AnimatePresence mode="wait">
          <motion.div key={slide.id} exit={{ opacity: 0, y: -24, transition: { duration: 0.45 } }}>
            <motion.span className={styles.eyebrow} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: d, ease: EASE }}>
              <motion.i className={styles.line} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.9, delay: d, ease: EASE }} />
              {slide.eyebrow}
            </motion.span>
            <SplitText as="h1" className={styles.title} text={slide.title} delay={d + 0.15} stagger={0.07} />
            <motion.p className={styles.text} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: d + 0.55, ease: EASE }}>
              {slide.text}
            </motion.p>
            <motion.div className={styles.ctas} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: d + 0.75, ease: EASE }}>
              <Button to={slide.cta.to} size="lg">{slide.cta.label}</Button>
              <Button to={slide.secondary.to} size="lg" variant="outline">{slide.secondary.label}</Button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <button className={cx(styles.arrow, styles.prev)} onClick={prev} aria-label="Anterior"><IoChevronBack size={24} /></button>
      <button className={cx(styles.arrow, styles.next)} onClick={next} aria-label="Siguiente"><IoChevronForward size={24} /></button>

      <div className={styles.footer}>
        <div className={styles.counter} aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.strong key={index} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }} transition={{ duration: 0.4, ease: EASE }}>
              {pad(index + 1)}
            </motion.strong>
          </AnimatePresence>
          <span>/ {pad(HERO_SLIDES.length)}</span>
        </div>
        <div className={styles.dots}>
          {HERO_SLIDES.map((s, i) => (
            <button key={s.id} className={cx(styles.dot, i === index && styles.dotActive)} onClick={() => setIndex(i)} aria-label={`Ir a ${s.title}`} aria-current={i === index}>
              {i === index && <span key={index} className={styles.progress} style={{ animationDuration: `${INTERVAL}ms`, animationPlayState: paused ? "paused" : "running" }} />}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.scroll} aria-hidden="true">
        <span>Scroll</span>
        <i />
      </div>
    </section>
  );
}
