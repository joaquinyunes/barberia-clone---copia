export const PRELOADER_KEY = "jack.preloaded";

/** El preloader se muestra solo la primera vez de la sesión (y nunca en tests automatizados). */
function shouldShowPreloader() {
  if (typeof window === "undefined" || navigator.webdriver) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    return !sessionStorage.getItem(PRELOADER_KEY);
  } catch {
    return true;
  }
}

/** Se calcula una sola vez al cargar la página. */
export const SHOW_PRELOADER = shouldShowPreloader();

/** Segundos que esperan las animaciones de entrada del hero para no pisarse con el preloader. */
export const INTRO_DELAY = SHOW_PRELOADER ? 2.1 : 0.15;
