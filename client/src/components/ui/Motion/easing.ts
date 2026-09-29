/**
 * Curvas y duraciones compartidas por todas las animaciones del sitio público.
 * Usar siempre estas: una sola "voz" de movimiento es lo que hace que todo se sienta suave.
 */

/** Salida exponencial: arranca rápido y se asienta muy despacio (la curva principal). */
export const EASE_OUT = [0.19, 1, 0.22, 1] as const;
/** Entrada/salida suave para cortinas y máscaras que cruzan toda la pantalla. */
export const EASE_IN_OUT = [0.76, 0, 0.24, 1] as const;

export const DURATION = 1.3;
