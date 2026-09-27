# 01 · Análisis del sitio de referencia

> Referencia: `https://jacktheclipper.co.uk/` — barbería turca tradicional en Londres
> (sucursales Bow Lane, Mayfair y Spitalfields, sala VIP "Chamber 88", tienda de vouchers).

## ⚠️ Cómo se hizo este análisis

El entorno en la nube donde se generó este documento **bloquea el dominio** `jacktheclipper.co.uk`
(el proxy de red rechaza la conexión: Playwright, `curl` y fetch fallan con 403). Por eso el mapa
se reconstruyó a partir del índice público de buscadores y del código que ya existe en este repo.

Para validar **cada pixel** (colores exactos, tipografías, espaciados, animaciones) hay que correr
el script de auditoría con Playwright **en tu máquina local**, que sí tiene acceso:

```bash
cd tools/site-audit
npm install
node audit.mjs            # genera ./output/<pagina>/{desktop,mobile}.png + structure.json
```

Cada punto marcado como **(verificar)** abajo se confirma con esa salida antes de maquetar.

## ⚖️ Qué se replica y qué no

Se replica **la estructura, el layout, la navegación, los componentes y las funcionalidades**.
No se copian el logo, las fotos, los textos de marketing ni el nombre comercial de la marca original
(son propiedad de ese negocio): usamos marca, textos e imágenes propias (lo que el repo ya hace con
"Tu Barbería" en español). Así el proyecto es publicable y sirve de portfolio sin problemas legales.

---

## 1. Mapa del sitio (páginas encontradas)

| # | Página original | Ruta en nuestro clon | Tipo |
|---|---|---|---|
| 1 | `/` Home | `/` | Landing |
| 2 | `/jacks-story/` Historia del fundador | `/historia` | Contenido |
| 3 | `/why-us/` Por qué elegirnos | `/por-que-nosotros` | Contenido |
| 4 | `/locations/` Listado de sucursales | `/ubicaciones` | Listado |
| 5 | `/locations/bow-lane/` | `/ubicaciones/:slug` | Detalle dinámico |
| 6 | `/locations/mayfair-2/` | `/ubicaciones/:slug` | Detalle dinámico |
| 7 | `/locations/spitalfields/` | `/ubicaciones/:slug` | Detalle dinámico |
| 8 | `/chamber-88/` Sala VIP | `/salon-vip` | Landing secundaria |
| 9 | `/chamber-88/chamber-88-treatments/` | `/salon-vip/tratamientos` | Catálogo de servicios |
| 10 | `/shop/` Tienda de vouchers y packs | `/tienda` | E-commerce |
| 11 | `/product-category/<cat>/` | `/tienda/categoria/:slug` | Listado filtrado |
| 12 | `/product/<cat>/<producto>/` | `/tienda/producto/:slug` | Detalle de producto |
| 13 | Carrito / Checkout / Mi cuenta (WooCommerce, **verificar**) | `/carrito`, `/checkout`, `/cuenta` | E-commerce + auth |
| 14 | `/book-an-appointment/` Reservar turno | `/reservar` | Flujo de reserva |
| 15 | `/contact-us/` Contacto | `/contacto` | Formulario |
| 16 | Páginas legales (privacidad, términos, cookies — **verificar**) | `/legal/:slug` | Contenido |
| 17 | 404 | `*` | Error |
| 18 | *(nuevo, no público)* Panel de administración | `/admin/*` | Backoffice |

## 2. Componentes globales (se ven en todas las páginas)

| Componente | Qué hace | Funciones |
|---|---|---|
| **TopBar / Header** | Logo, menú principal, botón "Book" destacado, acceso cuenta/carrito | Se vuelve sólido/compacto al hacer scroll · menú hamburguesa en mobile · submenú desplegable de Ubicaciones y Salón VIP (**verificar**) · contador del carrito |
| **MobileMenu** | Drawer a pantalla completa | Abrir/cerrar, bloquear scroll del body, cerrar con `Esc` y al navegar |
| **Footer** | Columnas: marca + tagline, sucursales con dirección/teléfono, links, redes (Instagram, X) | Links a mapas, `tel:` y `mailto:` |
| **NewsletterForm** (**verificar**) | Suscripción por email | Validación + POST al backend |
| **CookieBanner** (**verificar**) | Consentimiento de cookies | Guarda preferencia en `localStorage` |
| **ScrollToTop** | Al cambiar de ruta, vuelve arriba | Hook de router |
| **CustomCursor** | Ya existe en el repo | Se migra a un hook `useCustomCursor` |

## 3. Página por página

### 3.1 Home `/`
1. **HeroSlider** — carrusel a pantalla completa (servicios / tienda / ubicaciones) con autoplay, flechas y dots.
2. **Intro / Tagline** — bloque "barbería premiada desde 1996", técnicas turcas tradicionales.
3. **ServiceCards** — 4 tarjetas de acceso rápido (Ubicaciones, Servicios, Reservar, Tienda) con animación al entrar en viewport.
4. **FeaturedServices** — servicios estrella (corte, afeitado ritual, toalla caliente, packs).
5. **VipTeaser** — banner del Salón VIP (sótano privado, bebida de cortesía).
6. **LocationsPreview** — las 3 sucursales con foto, dirección y CTA.
7. **Testimonials / Reviews** (**verificar**) — slider de reseñas.
8. **InstagramFeed** (**verificar**) — grilla de fotos.
9. **CTA final** — "Reservá tu turno".

### 3.2 Historia `/historia`
Hero con foto del fundador · bloques texto + imagen alternados · línea de tiempo (1996 → hoy) · CTA reservar.

### 3.3 Por qué nosotros `/por-que-nosotros`
Hero · grilla de diferenciales con íconos (formación tradicional, experiencia, walk-in o turno, premios) · CTA.

### 3.4 Ubicaciones `/ubicaciones` (ya empezada en el repo)
Hero · frase divisoria · grilla de tarjetas de sucursal · banner promo Salón VIP · mapa con los 3 marcadores.

### 3.5 Detalle de ubicación `/ubicaciones/:slug` (ya empezada en el repo)
Hero con foto de la sucursal · descripción · horarios por día · teléfono · cómo llegar · galería · mapa embebido · servicios disponibles en esa sede · CTA reservar **con la sede preseleccionada**.

### 3.6 Salón VIP `/salon-vip` y `/salon-vip/tratamientos`
Landing oscura/lujosa · beneficios (bebida de cortesía, extras sin costo) · tarjetas de tratamientos con precio, duración y lo que incluye (4 niveles: afeitado, corte+afeitado, fade, "presidencial") · botón "Reservar" y "Regalar como voucher".

### 3.7 Tienda `/tienda` (vouchers y packs de experiencia)
- **Listado**: filtros por categoría/sede, orden por precio, grilla de ProductCard.
- **Detalle**: galería, precio, descripción, selector de sede/cantidad, "Agregar al carrito", productos relacionados.
- **Carrito**: editar cantidades, quitar, subtotal, persistencia.
- **Checkout**: datos del comprador, email del destinatario del voucher, pago (Stripe en modo test), confirmación.
- **Voucher**: código único generado por el backend, enviado por email, canjeable al reservar.

### 3.8 Reservar `/reservar` (el corazón funcional)
Wizard en pasos: **1)** sede → **2)** servicio → **3)** barbero (o "cualquiera") → **4)** fecha en calendario → **5)** horario disponible → **6)** datos del cliente / login → **7)** confirmación + email.
Reglas: no se puede reservar un slot ocupado, respetar horario de la sede y duración del servicio, cancelar/reprogramar desde la cuenta.

### 3.9 Contacto `/contacto`
Formulario (nombre, email, sede, mensaje) con validación · datos de cada sede · mapa.

### 3.10 Cuenta `/cuenta`
Login / registro / recuperar contraseña · perfil · mis reservas (próximas y pasadas, cancelar) · mis pedidos y vouchers.

### 3.11 Admin `/admin` (extra necesario para que sea MERN real)
Dashboard (turnos del día, ventas) · CRUD de sedes, servicios, barberos, productos · agenda por sede/barbero · pedidos · mensajes de contacto · suscriptores.

## 4. Funcionalidades transversales

- Diseño responsive (mobile-first) y accesible (teclado, `aria-*`, contraste).
- Animaciones de entrada al hacer scroll y transiciones entre páginas.
- SEO: título y meta por página (`react-helmet-async`), `sitemap.xml`, datos estructurados `LocalBusiness`.
- Estados de carga (skeletons), vacío y error en cada vista con datos.
- i18n preparado (el repo está en español; el original en inglés).

## 5. Problemas detectados en el repo actual (a corregir en la Fase 0)

| Problema | Dónde | Acción |
|---|---|---|
| **API key de Google Maps commiteada** | `frontend/src/pages/Locations/Locations.tsx` | Revocar/rotar la key en Google Cloud, moverla a `VITE_GOOGLE_MAPS_KEY` en `.env` |
| `node_modules/` de la raíz versionado y sin `.gitignore` raíz | raíz | Agregar `.gitignore` y sacarlo del índice |
| Carpeta basura `public/img/Google Gemini_files/` (página guardada) | `frontend/public/img` | Eliminar |
| Rutas inconsistentes `/RESERVA` vs `/RESERVAR`, rutas en mayúsculas | `App.tsx`, `ServiceCardsSection.tsx`, `FooterSection.tsx` | Centralizar en `routes/paths.ts` |
| Imagen `logo-footer.png` referenciada pero inexistente, archivo `CORTES.ong` | footer / `public/img` | Corregir |
| Iframe de mapa con `src` inválido | `LocationSection.tsx`, `Locations.tsx` | Componente `MapEmbed` |
| Datos hardcodeados en componentes | `data/locations.ts`, slides, cards | Pasan a MongoDB + API |
| Backend vacío | `backend/` | Se construye completo |
| Dos librerías de animación (GSAP + Framer Motion) y Tailwind instalado sin usar | `frontend/package.json` | Quedarse con Framer Motion; quitar lo que no se usa |
