import { useEffect } from "react";
import Lenis from "lenis";
import { setLenis } from "./lenis";

/** Los diálogos (carrito, modales, menú mobile) scrollean nativo, sin inercia. */
const isDialog = (node: HTMLElement) => node.getAttribute("role") === "dialog" || node.hasAttribute("aria-modal");

/**
 * Scroll con inercia (Lenis): la rueda del mouse desliza la página en vez de saltar de a pasos,
 * y todas las animaciones ligadas al scroll (parallax, marquee) se mueven sin tirones.
 */
export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true, lerp: 0.085, smoothWheel: true, allowNestedScroll: true, prevent: isDialog });
    setLenis(lenis);

    // Cuando algo bloquea el scroll del body (preloader, modal, menú) pausamos la inercia.
    const sync = () => (document.body.style.overflow === "hidden" ? lenis.stop() : lenis.start());
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    sync();

    return () => {
      observer.disconnect();
      lenis.destroy();
      setLenis(null);
    };
  }, []);
  return null;
}
