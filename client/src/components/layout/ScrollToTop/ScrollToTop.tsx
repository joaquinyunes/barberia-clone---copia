import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();
  // Cuerpo con llaves: en Chrome reciente scrollTo devuelve una Promise y React
  // la trataría como función de limpieza ("destroy is not a function").
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
