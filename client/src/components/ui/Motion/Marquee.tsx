import { motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";
import { GiRazor } from "react-icons/gi";
import { cx } from "@/utils/format";
import styles from "./Motion.module.css";

/** Mantiene `v` dentro de [min, max) para que el loop no tenga cortes. */
const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

/**
 * Cinta de texto infinita. Avanza sola despacio y acelera con la velocidad del scroll,
 * volviendo a su ritmo con un resorte suave (el contenido se duplica para que el loop sea continuo).
 */
export function Marquee({ items, reverse, tone = "gold", speed = 1.6 }: { items: string[]; reverse?: boolean; tone?: "gold" | "outline"; /** % del recorrido por segundo */ speed?: number }) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 60, stiffness: 300 });
  const boost = useTransform(velocity, [-2500, 0, 2500], [5, 0, 5], { clamp: true });
  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    const step = speed * (delta / 1000) * (1 + boost.get());
    baseX.set(baseX.get() + (reverse ? step : -step));
  });

  const row = (hidden?: boolean) => (
    <div className={styles.marqueeRow} aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <span key={`${t}-${i}`} className={styles.marqueeItem}>
          {t}
          <GiRazor className={styles.marqueeIcon} />
        </span>
      ))}
    </div>
  );
  return (
    <div className={cx(styles.marquee, styles[tone])}>
      <motion.div className={styles.marqueeTrack} style={{ x }}>
        {row()}
        {row(true)}
      </motion.div>
    </div>
  );
}
