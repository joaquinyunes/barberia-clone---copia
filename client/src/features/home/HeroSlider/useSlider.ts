import { useCallback, useEffect, useState } from "react";
import { useMotionValue, useReducedMotion } from "framer-motion";

/**
 * Carrusel infinito con autoplay.
 * - `progress` (0 → 1) es un MotionValue que avanza solo mientras el carrusel corre: se usa para
 *   dibujar la barra de tiempo y queda siempre sincronizado con el cambio de diapositiva.
 * - Se pausa por interacción (mouse/teclado), con la pestaña oculta o fuera de pantalla,
 *   y no hay autoplay si la persona pidió menos movimiento.
 * - `direction` (1 adelante, -1 atrás) permite animar entrada y salida según el sentido.
 */
export function useSlider(count: number, interval = 6500) {
  const [{ index, direction }, setState] = useState({ index: 0, direction: 1 });
  const [engaged, setEngaged] = useState(false);
  const [tabHidden, setTabHidden] = useState(() => typeof document !== "undefined" && document.hidden);
  const [onScreen, setOnScreen] = useState(true);
  const [node, setNode] = useState<Element | null>(null);
  const reduce = useReducedMotion();
  const progress = useMotionValue(0);

  const next = useCallback(() => setState((s) => ({ index: (s.index + 1) % count, direction: 1 })), [count]);
  const prev = useCallback(() => setState((s) => ({ index: (s.index - 1 + count) % count, direction: -1 })), [count]);
  const goTo = useCallback(
    (i: number) => setState((s) => (i === s.index ? s : { index: ((i % count) + count) % count, direction: i > s.index ? 1 : -1 })),
    [count],
  );

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.2 });
    io.observe(node);
    return () => io.disconnect();
  }, [node]);

  const paused = engaged || tabHidden || !onScreen || !!reduce;

  // Cada diapositiva arranca con el reloj en cero (también cuando se elige a mano).
  useEffect(() => {
    progress.set(0);
  }, [index, progress]);

  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const p = progress.get() + Math.min(now - last, 100) / interval; // el tope evita saltos tras un parón
      last = now;
      if (p >= 1) {
        progress.set(0);
        next();
      } else {
        progress.set(p);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, interval, next, progress]);

  return {
    index,
    direction,
    progress,
    paused,
    next,
    prev,
    goTo,
    setIndex: goTo,
    pause: () => setEngaged(true),
    resume: () => setEngaged(false),
    /** Ref callback del elemento raíz: permite pausar cuando no se ve en pantalla. */
    ref: setNode,
  };
}
