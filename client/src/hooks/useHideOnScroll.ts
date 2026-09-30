import { useEffect, useState } from "react";

/** true mientras se baja por la página (pasado `offset`); vuelve a false apenas se sube. */
export function useHideOnScroll(offset = 400) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 6) return;
      setHidden(y > last && y > offset);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return hidden;
}
