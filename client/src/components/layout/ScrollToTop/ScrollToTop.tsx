import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollToTop } from "../SmoothScroll/lenis";

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => scrollToTop(), [pathname]);
  return null;
}
