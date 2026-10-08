import { useRef, type PointerEvent } from "react";

/**
 * Detecta un deslizamiento horizontal con el dedo (los mouse no cuentan: tienen flechas).
 * Usarlo junto con `touch-action: pan-y` para que el scroll vertical siga funcionando.
 */
export function useSwipe(onSwipe: (direction: 1 | -1) => void, threshold = 48) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: PointerEvent) => {
      start.current = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
}
