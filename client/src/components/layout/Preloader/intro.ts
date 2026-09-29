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

/** Segundos que el preloader queda en pantalla antes de subir el telón (el telón tarda ~1,4 s más). */
export const PRELOADER_HOLD = 2.2;

/** Segundos que esperan las animaciones de entrada del hero: arrancan mientras el telón termina de subir. */
export const INTRO_DELAY = SHOW_PRELOADER ? PRELOADER_HOLD + 0.9 : 0.2;
