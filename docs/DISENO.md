# Diseño y accesibilidad — Barbería «Jack el Barbero» (2026-11-01)

Alcance: **mejorar sin rediseñar**. Se conserva la dirección artística (negro cálido y dorado, Playfair + Oswald + Inter, scroll con inercia, preloader, parallax, cursor propio).
Método: API + Vite locales con MongoDB descartable sembrada con el `seed` del repo, navegador a 375 px (portada, reservar, servicios, tienda, contacto, sedes, ingreso, checkout, club) y el **panel completo con sesión de dueño** (30 pantallas), y una auditoría automática en página (encabezados, etiquetas, tamaño de controles, contraste de cada texto visible, desborde horizontal). Criterio: WCAG 2.1 AA; botones a 44 px.
Skills usadas: `design:accessibility-review`, `design:design-critique` y `design:ux-copy` como criterio; `ui-ux-pro-max` y `web-design-guidelines` no estaban disponibles en esta sesión.
Base: `feat/backoffice-turnos` en `6948b26` (incluye turnos v2 y lista de espera).

## Hallazgos y estado

| # | Prioridad | Dónde | Hallazgo (evidencia a 375 px) | Estado |
|---|---|---|---|---|
| 1 | Alta | Todo el sitio | `AppProviders` fijaba `MotionConfig reducedMotion="never"` («las animaciones son la identidad»): **ignoraba la preferencia de movimiento reducido del sistema** (WCAG 2.3.3). No había ninguna regla `prefers-reduced-motion` en el CSS. | **Corregido sin cambiar lo que ve el resto**: `reducedMotion="user"`, Lenis (scroll con inercia) no arranca, y CSS global que apaga animaciones y transiciones solo si la persona lo pidió. Revierte una decisión previa explícita: conviene confirmarla con quien la tomó. |
| 2 | Alta | Panel (todas las pantallas) | Menú lateral con 37 px por ítem, cierre del menú 34×24, botones/campos/filtros de 34–43 px (de 35 a 86 controles bajo 44 px por pantalla). | **Corregido** en celular y tablet (`pointer: coarse` o ≤ 960 px): ítems, botones, campos, chips, pestañas y selectores a 44 px. |
| 3 | Alta | Panel · Centro de saldos, Adelantos y deudas | **Desborde horizontal de la página** (+230 y +122 px): pestañas dentro de la cabecera de la tarjeta y columnas `1fr` que crecen con su contenido. | **Corregido** (`minmax(0,1fr)`, `max-width:100%` en las acciones): 0 px de desborde. |
| 4 | Alta | Panel | Campos sin etiqueta: selectores de Liquidaciones, Movimientos (2), Productos, Auditoría y el campo de categorías de Configuración. | **Corregido** en la raíz: `Field` usa el `placeholder` como `aria-label` cuando no hay `label`, y dos etiquetas explícitas. |
| 5 | Alta | Sitio y panel | Contraste de las etiquetas (`Badge`): «Cerrado · abre lunes» 3,9:1 sobre el fondo oscuro; títulos de grupo del menú del panel 4,4:1 a 10,5 px. | **Corregido**: colores de `Badge` por variable (oscuro en el sitio, claro en el panel y en los modales claros) y `#9a8f79` en el menú. |
| 6 | Alta | Checkout vacío | La pantalla «Tu carrito está vacío» no tenía `<h1>` (el título era un `<p>`). | **Corregido**: `EmptyState as="h1"` con la misma apariencia. Hay prueba nueva. |
| 7 | Media | Encabezado y pie | Menú 38×28, ingreso 34, carrito 35, logo 38, pie con iconos de 22 px y enlaces de 22 px, «Reservar este servicio» 19 px, «Agregar» 40 px, pasos de la reserva 31 px, «Reservar acá» 43 px. | **Corregido** con 44 px (en el pie, solo en táctil o ≤ 560 px para no alargar el escritorio). |
| 8 | Media | Panel | El foco de los campos era un resplandor dorado al 20 %. | **Corregido**: contorno de 2 px (dorado oscuro en fondo claro). |
| 9 | Baja | Portada | Atajos de sección «Ir a…» de 36×2 px (puntos del lateral). | Abierto: son un atajo redundante con el scroll. |
| 10 | Baja | Panel | Casillas de Configuración de 13–15 px (su etiqueta sí es clicable); selector «Todas las sedes» de Reportes y de Turnos con 38 px (no usan la clase común). | Abierto. |
| 11 | Baja | Reserva | «La Cava VIP» (insignia sobre foto) 1:1 bajo AA en el paso de sede. | Abierto: depende de la foto de fondo. |

## Pruebas
- Cliente: `tsc -b --noEmit` sin errores, `eslint` sin avisos, `vite build` correcto, pruebas nuevas (`EmptyState`) y existentes en verde.
- Servidor: `tsc` y build correctos; **49 de 50 pruebas pasan** (necesitan MongoDB: se corrieron con `MONGO_TEST_URI` apuntando a un `mongod` descartable). La que falla, `last-cut.test.ts` («Lo mismo que la última vez»), **ya fallaba antes** (no se tocó el servidor): compara fechas contra el día **UTC** y falla en las tres horas en que Buenos Aires ya cambió de día respecto de UTC (de 21:00 a 24:00).
- Auditoría final en página: 0 campos sin etiqueta, 1 `<h1>` por pantalla y 0 desborde en las pantallas medidas; los controles bajo 44 px que quedan están en la tabla.

## No verificado
Lector de pantalla real, tablet física, el flujo de pago con Mercado Pago, la tienda con sesión de cliente y las pantallas del panel que no se listan (se midieron 30 rutas; el contraste y el tamaño se midieron en 10 después de los cambios). La carpeta original `barberia-clone` tiene cambios sin commitear de otras sesiones; esta rama parte del commit de la rama base.
