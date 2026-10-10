import { animate, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { EASE_OUT } from "./easing";

/** Número que cuenta desde 0 hasta `to` cuando aparece en pantalla. */
export function Counter({ to, suffix = "", duration = 2.6 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, { duration, ease: EASE_OUT, onUpdate: (v) => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString("es-AR")}
      {suffix}
    </span>
  );
}
