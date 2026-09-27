import { useEffect, useState } from "react";

/** true cuando la página se desplazó más de `offset` px (header compacto). */
export function useScrolled(offset = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return scrolled;
}
