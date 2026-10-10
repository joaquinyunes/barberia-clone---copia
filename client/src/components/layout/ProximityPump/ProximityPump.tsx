import { useEffect } from "react";

/** Distancia (px) a la que el texto empieza a inflarse al acercar el mouse, y su crecimiento máximo por defecto. */
const RADIUS = 160;
const AMOUNT = 0.08;
/** Fracción del camino que recorre cada frame hacia el valor objetivo (suavizado). */
const EASE = 0.16;

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * "Bombeo" del texto: los elementos marcados con `data-pump` crecen suavemente a medida que el mouse
 * se les acerca y vuelven a su tamaño al alejarse (el efecto del sitio de referencia).
 *
 * - `data-pump="center"`: escala desde el centro (texto centrado). Sin valor: desde el borde izquierdo.
 * - `data-pump-amount="0.04"`: crecimiento máximo propio (4 %); útil en párrafos largos.
 *
 * Solo con mouse y sin `prefers-reduced-motion`. Los elementos marcados no deben tener otra
 * `transform` propia (usá un hijo si la necesitás).
 */
export function ProximityPump() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    const progress = new WeakMap<HTMLElement, number>();
    let x = -9999;
    let y = -9999;
    let raf = 0;

    const request = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    function frame() {
      raf = 0;
      const els = Array.from(document.querySelectorAll<HTMLElement>("[data-pump]"));
      const vh = window.innerHeight;

      // Primero leemos todas las medidas y después escribimos, para no forzar layout por elemento.
      const next = els.map((el) => {
        const r = el.getBoundingClientRect();
        const amount = Number(el.dataset.pumpAmount) || AMOUNT;
        const originX = el.dataset.pump === "center" ? 0.5 : 0;
        const cur = progress.get(el) ?? 0;
        const scale = 1 + cur * amount;
        // Caja sin escalar: la medida actual ya incluye el crecimiento y sesgaría la distancia.
        const w = r.width / scale;
        const h = r.height / scale;
        const left = r.left + (scale - 1) * originX * w;
        const top = r.top + (scale - 1) * 0.5 * h;
        const dx = Math.max(left - x, 0, x - (left + w));
        const dy = Math.max(top - y, 0, y - (top + h));
        const offscreen = r.bottom < -RADIUS || r.top > vh + RADIUS;
        const target = offscreen ? 0 : smooth(Math.max(0, 1 - Math.hypot(dx, dy) / RADIUS));
        let value = cur + (target - cur) * EASE;
        if (Math.abs(target - value) < 0.002) value = target;
        return { el, amount, originX, value, target };
      });

      let settling = false;
      for (const { el, amount, originX, value, target } of next) {
        progress.set(el, value);
        if (value === 0) {
          if (el.style.transform) el.style.transform = "";
        } else {
          el.style.transformOrigin = originX ? "center" : "left center";
          el.style.transform = `scale(${(1 + value * amount).toFixed(4)})`;
        }
        if (value !== target) settling = true;
      }
      if (settling) request();
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      request();
    };
    const onLeave = () => {
      x = -9999;
      y = -9999;
      request();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", request, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", request);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
      document.querySelectorAll<HTMLElement>("[data-pump]").forEach((el) => {
        el.style.transform = "";
      });
    };
  }, []);

  return null;
}
