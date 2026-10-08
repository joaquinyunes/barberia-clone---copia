import { useRef, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";
import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { INTRO_DELAY } from "@/components/layout/Preloader/intro";
import { Button, Img, Magnetic, SplitText } from "@/components/ui";
import { useSwipe } from "@/hooks/useSwipe";
import { cx } from "@/utils/format";
import { HERO_SLIDES } from "./slides";
import { useSlider } from "./useSlider";
import styles from "./HeroSlider.module.css";

const INTERVAL = 7000;
const EASE = [0.16, 1, 0.3, 1] as const;
const EASE_IN_OUT = [0.77, 0, 0.18, 1] as const;
const pad = (n: number) => String(n).padStart(2, "0");

/** Fondo: la nueva foto entra con una cortina desde el lado del avance mientras la anterior se desliza hacia atrás. */
const bgVariants = {
  enter: (dir: number) => ({ clipPath: dir > 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" }),
  center: { clipPath: "inset(0 0 0 0)", x: "0%", opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-12%" : "12%", opacity: 0.3 }),
};
const contentVariants = {
  exit: (dir: number) => ({ opacity: 0, x: dir * -36 }),
};
const counterVariants = {
  enter: (dir: number) => ({ y: dir > 0 ? "100%" : "-100%" }),
  center: { y: "0%" },
  exit: (dir: number) => ({ y: dir > 0 ? "-100%" : "100%" }),
};

export function HeroSlider() {
  const { index, direction, progress, next, prev, goTo, pause, resume, ref: observe } = useSlider(HERO_SLIDES.length, INTERVAL);
  const slide = HERO_SLIDES[index];
  const swipe = useSwipe((dir) => (dir > 0 ? next() : prev()));

  // La primera diapositiva espera a que termine el preloader; las siguientes entran enseguida.
  const firstRun = useRef(true);
  if (index !== 0) firstRun.current = false;
  const d = firstRun.current ? INTRO_DELAY : 0.15;

  const ref = useRef<HTMLElement | null>(null);
  const setRef = (el: HTMLElement | null) => {
    ref.current = el;
    observe(el);
  };

  // Parallax al hacer scroll: la foto baja más lento y el texto se desvanece.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // Parallax con el mouse: la foto se mueve apenas en sentido contrario (da profundidad).
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const bgX = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.8 });
  const bgShiftY = useSpring(my, { stiffness: 60, damping: 20, mass: 0.8 });
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(-((e.clientX - r.left) / r.width - 0.5) * 28);
    my.set(-((e.clientY - r.top) / r.height - 0.5) * 18);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") next();
    else if (e.key === "ArrowLeft") prev();
  };
  // Con el teclado se pausa; un toque con el dedo no debe dejarlo pausado para siempre.
  const onFocus = (e: FocusEvent) => {
    if (e.target.matches?.(":focus-visible")) pause();
  };

  return (
    <section
      ref={setRef}
      className={styles.hero}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={onFocus}
      onBlur={resume}
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      {...swipe}
      aria-roledescription="carrusel"
      aria-label="Destacados"
    >
      <motion.div className={styles.bgWrap} style={{ y: bgY }}>
        <motion.div className={styles.layer} style={{ x: bgX, y: bgShiftY }}>
          <AnimatePresence initial={false} custom={direction}>
            <motion.div key={slide.id} className={styles.bg} custom={direction} variants={bgVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 1.3, ease: EASE_IN_OUT }}>
              {/* Ken Burns: zoom lento mientras dura la diapositiva */}
              <motion.div className={styles.kenburns} initial={{ scale: 1.18 }} animate={{ scale: 1.02 }} transition={{ duration: INTERVAL / 1000 + 2, ease: "linear" }}>
                <Img src={slide.image} alt="" loading="eager" fetchPriority="high" />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
      <div className={styles.overlay} />
      <div className={styles.grain} aria-hidden="true" />

      <motion.div className={styles.content} style={{ y: contentY, opacity: contentOpacity }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={slide.id} custom={direction} variants={contentVariants} exit="exit" transition={{ duration: 0.4, ease: EASE }}>
            <motion.span className={styles.eyebrow} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: d, ease: EASE }}>
              <motion.i className={styles.line} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.9, delay: d, ease: EASE }} />
              {slide.eyebrow}
            </motion.span>
            <SplitText as="h1" className={styles.title} text={slide.title} delay={d + 0.15} stagger={0.07} />
            <motion.p className={styles.text} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: d + 0.55, ease: EASE }}>
              {slide.text}
            </motion.p>
            <motion.div className={styles.ctas} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: d + 0.75, ease: EASE }}>
              <Magnetic>
                <Button to={slide.cta.to} size="lg">{slide.cta.label}</Button>
              </Magnetic>
              <Magnetic>
                <Button to={slide.secondary.to} size="lg" variant="outline">{slide.secondary.label}</Button>
              </Magnetic>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <button className={cx(styles.arrow, styles.prev)} onClick={prev} aria-label="Anterior"><IoChevronBack size={24} /></button>
      <button className={cx(styles.arrow, styles.next)} onClick={next} aria-label="Siguiente"><IoChevronForward size={24} /></button>

      <div className={styles.footer}>
        <div className={styles.counter} aria-hidden="true">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.strong key={index} custom={direction} variants={counterVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: EASE }}>
              {pad(index + 1)}
            </motion.strong>
          </AnimatePresence>
          <span>/ {pad(HERO_SLIDES.length)}</span>
        </div>
        <div className={styles.dots}>
          {HERO_SLIDES.map((s, i) => (
            <button key={s.id} className={cx(styles.dot, i === index && styles.dotActive)} onClick={() => goTo(i)} aria-label={`Ir a ${s.title}`} aria-current={i === index}>
              {i === index && <motion.span className={styles.progress} style={{ scaleX: progress }} />}
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
