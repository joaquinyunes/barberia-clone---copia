import type Lenis from "lenis";

/** Instancia única del scroll suave (null en el panel, en touch o con "reducir movimiento"). */
let instance: Lenis | null = null;

export const setLenis = (l: Lenis | null) => {
  instance = l;
};

/** Sube al inicio sin animación (al cambiar de página). */
export function scrollToTop() {
  if (instance) instance.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}
