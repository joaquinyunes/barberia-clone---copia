import { useCallback, useEffect, useState } from "react";

/** Carrusel infinito con autoplay que se pausa al interactuar. */
export function useSlider(count: number, interval = 6500) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, interval);
    return () => clearInterval(id);
  }, [next, interval, paused, index]);
  return { index, setIndex, next, prev, paused, pause: () => setPaused(true), resume: () => setPaused(false) };
}
