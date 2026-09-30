import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { INTRO_DELAY } from "@/components/layout/Preloader/intro";
import { Button, Img, SplitText } from "@/components/ui";
import { DURATION, EASE_IN_OUT, EASE_OUT } from "@/components/ui/Motion/easing";
import { cx } from "@/utils/format";
import { HERO_SLIDES } from "./slides";
import { useSlider } from "./useSlider";
import styles from "./HeroSlider.module.css";

const INTERVAL = 8000;
const pad = (n: number) => String(n).padStart(2, "0");

export function HeroSlider() {
  const { index, setIndex, next, prev, paused, pause, resume } = useSlider(HERO_SLIDES.length, INTERVAL);
  const slide = HERO_SLIDES[index];

  // La primera diapositiva espera a que termine el preloader; las siguientes entran enseguida.
  const firstRun = useRef(true);
  useEffect(() => {
    if (index !== 0) firstRun.current = false;
  }, [index]);
  const d = firstRun.current ? INTRO_DELAY : 0.35;

  // Parallax al hacer scroll: la foto baja más lento y el texto se desvanece.
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  // Controles (flechas, contador, puntos) se van antes, así el texto nunca se les superpone.
  const controlsOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  return (
    <section ref={ref} className={styles.hero} onMouseEnter={pause} onMouseLeave={resume} aria-roledescription="carrusel" aria-label="Destacados">
      <motion.div className={styles.bgWrap} style={{ y: bgY }}>
        <AnimatePresence initial={false}>
          <motion.div
            key={slide.id}
            className={styles.bg}
            // La foto nueva aparece encima mientras la anterior queda quieta debajo: sin "baches" oscuros.
            initial={{ opacity: 0, zIndex: 1 }}
            animate={{ opacity: 1, zIndex: 1 }}
            exit={{ zIndex: 0, opacity: 0, transition: { opacity: { duration: 0.01, delay: 2 } } }}
            transition={{ opacity: { duration: 2, ease: "easeInOut" } }}
          >
            {/* Ken Burns: zoom lento y continuo mientras dura la diapositiva */}
            <motion.div className={styles.kenburns} initial={{ scale: 1.14 }} animate={{ scale: 1 }} transition={{ duration: INTERVAL / 1000 + 3, ease: [0.25, 0.1, 0.25, 1] }}>
              <Img src={slide.image} alt="" loading="eager" fetchPriority="high" />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <div className={styles.overlay} />
      <div className={styles.grain} aria-hidden="true" />

      <motion.div className={styles.content} style={{ y: contentY, opacity: contentOpacity }}>
        <AnimatePresence mode="wait">
          <motion.div key={slide.id} exit={{ opacity: 0, y: -12, transition: { duration: 0.7, ease: EASE_IN_OUT } }}>
            <motion.span className={styles.eyebrow} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DURATION, delay: d, ease: EASE_OUT }}>
              <motion.i className={styles.line} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.6, delay: d, ease: EASE_OUT }} />
              {slide.eyebrow}
            </motion.span>
            <SplitText as="h1" className={styles.title} text={slide.title} delay={d + 0.1} stagger={0.06} />
            <motion.p className={styles.text} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DURATION, delay: d + 0.5, ease: EASE_OUT }}>
              {slide.text}
            </motion.p>
            <motion.div className={styles.ctas} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DURATION, delay: d + 0.7, ease: EASE_OUT }}>
              <Button to={slide.cta.to} size="lg">{slide.cta.label}</Button>
              <Button to={slide.secondary.to} size="lg" variant="outline">{slide.secondary.label}</Button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <motion.div style={{ opacity: controlsOpacity }}>
        <button className={cx(styles.arrow, styles.prev)} onClick={prev} aria-label="Anterior"><IoChevronBack size={22} /></button>
        <button className={cx(styles.arrow, styles.next)} onClick={next} aria-label="Siguiente"><IoChevronForward size={22} /></button>
      </motion.div>

      <motion.div className={styles.footer} style={{ opacity: controlsOpacity }}>
        <div className={styles.counter} aria-hidden="true">
          <AnimatePresence mode="wait" initial={false}>
            <motion.strong key={index} initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "-100%", opacity: 0 }} transition={{ duration: 0.6, ease: EASE_OUT }}>
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
      </motion.div>
      <motion.div className={styles.scroll} style={{ opacity: controlsOpacity }} aria-hidden="true">
        <span>Scroll</span>
        <i />
      </motion.div>
    </section>
  );
}
