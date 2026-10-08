import { Children, useCallback, useEffect, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { cx } from "@/utils/format";
import styles from "./SnapCarousel.module.css";

interface Metrics {
  scrollable: boolean;
  atStart: boolean;
  atEnd: boolean;
  /** Fracción visible del contenido total (ancho de la barra de progreso). */
  ratio: number;
  /** Posición del scroll, de 0 a 1. */
  offset: number;
}

const INITIAL: Metrics = { scrollable: false, atStart: true, atEnd: false, ratio: 1, offset: 0 };

/**
 * Carrusel horizontal con scroll-snap: nativo y fluido con el dedo, y con flechas, barra de progreso
 * y arrastre con el mouse. Cuántas tarjetas se ven lo decide el CSS del que lo usa con las variables
 * `--per-view` y `--gap`; si todas entran, los controles se ocultan solos.
 */
export function SnapCarousel({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });
  const [m, setM] = useState<Metrics>(INITIAL);
  const [dragging, setDragging] = useState(false);
  const count = Children.count(children);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setM({
      scrollable: max > 2,
      atStart: el.scrollLeft <= 2,
      atEnd: el.scrollLeft >= max - 2,
      ratio: el.clientWidth / el.scrollWidth,
      offset: max > 0 ? Math.min(1, el.scrollLeft / max) : 0,
    });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    measure();
    el.addEventListener("scroll", schedule, { passive: true });
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    ro?.observe(el);
    Array.from(el.children).forEach((c) => ro?.observe(c));
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", schedule);
      ro?.disconnect();
    };
  }, [measure, count]);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };

  // Arrastre con mouse (con el dedo el navegador ya hace scroll solo).
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !m.scrollable || !track.current) return;
    drag.current = { active: true, startX: e.clientX, startLeft: track.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active || !track.current) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      setDragging(true);
      track.current.setPointerCapture?.(e.pointerId);
    }
    if (d.moved) track.current.scrollLeft = d.startLeft - dx;
  };
  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
  };
  // Si hubo arrastre, el "click" de soltar no debe abrir el link de la tarjeta.
  const onClickCapture = (e: MouseEvent) => {
    if (!drag.current.moved) return;
    e.preventDefault();
    e.stopPropagation();
    drag.current.moved = false;
  };

  return (
    <div className={cx(styles.root, className)} data-cursor={m.scrollable ? "Arrastrá" : undefined}>
      <div
        ref={track}
        className={cx(styles.track, dragging && styles.dragging)}
        role="group"
        aria-roledescription="carrusel"
        aria-label={label}
        tabIndex={m.scrollable ? 0 : -1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        onDragStart={(e: DragEvent) => e.preventDefault()}
      >
        {Children.map(children, (child) => (
          <div className={styles.slide}>{child}</div>
        ))}
      </div>
      {m.scrollable && (
        <div className={styles.controls}>
          <div className={styles.bar} aria-hidden="true">
            <span style={{ width: `${m.ratio * 100}%`, transform: `translateX(${m.offset * (1 / m.ratio - 1) * 100}%)` }} />
          </div>
          <button className={styles.arrow} onClick={() => page(-1)} disabled={m.atStart} aria-label="Ver anteriores"><IoChevronBack size={20} /></button>
          <button className={styles.arrow} onClick={() => page(1)} disabled={m.atEnd} aria-label="Ver siguientes"><IoChevronForward size={20} /></button>
        </div>
      )}
    </div>
  );
}
