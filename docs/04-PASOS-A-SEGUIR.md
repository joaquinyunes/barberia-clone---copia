# 04 · Pasos a seguir (roadmap)

Cada fase termina con algo que funciona y un commit/PR propio. Nada se empieza sin que la fase anterior compile y pase los tests.

## Fase 0 — Auditoría visual y limpieza (½ día)
- [ ] Correr `tools/site-audit` **en local** (el entorno cloud no llega al sitio) y guardar screenshots desktop/mobile + `structure.json` de cada página.
- [ ] De los screenshots, extraer **tokens de diseño**: paleta, tipografías (familias, pesos, tamaños), espaciados, radios, sombras, breakpoints → `client/src/styles/tokens.css`.
- [ ] **Rotar la API key de Google Maps** que quedó en el historial de git y pasarla a `.env`.
- [ ] Agregar `.gitignore` raíz, sacar `node_modules/` del índice, borrar `public/img/Google Gemini_files/`.
- [ ] Confirmar las páginas marcadas "(verificar)" en `01-ANALISIS-DEL-SITIO.md`.

## Fase 1 — Esqueleto del monorepo (½ día)
- [ ] `package.json` raíz con workspaces `client`, `server`, `packages/shared`.
- [ ] Mover `frontend/` → `client/` y `backend/` → `server/` (con `git mv` para conservar historial).
- [ ] TypeScript, ESLint, Prettier y Vitest configurados en los 3 paquetes.
- [ ] `docker-compose.yml` con MongoDB. Script `npm run dev` levanta Mongo + API + cliente.

## Fase 2 — Backend base (1 día)
- [ ] `config/env.ts`, `db.ts`, `app.ts`, `server.ts`, logger, `AppError`, `errorHandler`, `notFound`, `validate`.
- [ ] Health check `GET /api/v1/health` + test Supertest.
- [ ] Módulos de sólo lectura: `locations`, `services`, `barbers`, `content`, `products` (model → repository → service → controller → routes).
- [ ] `seed.ts` con datos propios (3 sedes, ~10 servicios, 6 barberos, 8 vouchers, slides, testimonios).

## Fase 3 — Frontend base y layout (1 día)
- [ ] `tokens.css`, reset, tipografías.
- [ ] Átomos `components/ui/*` (Button, Input, Card, Modal, Drawer, Skeleton, Carousel, Reveal, MapEmbed…).
- [ ] `services/http.ts`, `AppProviders`, `AppRouter` con `paths.ts` y páginas `lazy`.
- [ ] `MainLayout`: **Header** (scroll, dropdowns, carrito), **MobileMenu**, **Footer**, **CookieBanner**, ScrollToTop, CustomCursor → comparar contra screenshots.

## Fase 4 — Páginas de contenido (1–2 días)
- [ ] **Home** completa: HeroSlider, Intro, QuickLinks, FeaturedServices, VipTeaser, LocationsPreview, Testimonials, CTA.
- [ ] Historia, Por qué nosotros, Legales, 404.
- [ ] Ubicaciones + Detalle (refactor de lo existente para leer de la API).
- [ ] Salón VIP + Tratamientos, Servicios.
- [ ] Test visual Playwright por página (screenshot baseline).

## Fase 5 — Autenticación y cuenta (1 día)
- [ ] Backend: `users`, `auth` (register/login/refresh/logout/forgot/reset), `authenticate`, `authorize`, rate limit.
- [ ] Frontend: `authStore`, interceptor de refresh, Login/Registro/Recuperar, `ProtectedRoute`, página Cuenta (perfil).

## Fase 6 — Reservas (2 días) ⭐
- [ ] `availability.service` + tests unitarios (bordes: cierre de la sede, turnos solapados, servicios largos, zona horaria).
- [ ] `appointments` CRUD + índice anti doble-reserva + email de confirmación.
- [ ] `BookingWizard` con los 7 pasos, preselección desde `?location=` / `?service=`.
- [ ] "Mis reservas": ver, cancelar, reprogramar.
- [ ] E2E Playwright: reservar de punta a punta.

## Fase 7 — Tienda y pagos (2 días)
- [ ] Listado con filtros/orden, categoría, detalle, relacionados.
- [ ] `cartStore` persistente + CartDrawer + CartPage.
- [ ] `orders/checkout` con Stripe (modo test) + webhook → `Voucher` con código único + email.
- [ ] Canje de voucher en el paso de reserva.
- [ ] E2E: comprar un voucher con tarjeta de test `4242 4242 4242 4242`.

## Fase 8 — Contacto, newsletter y admin (1–2 días)
- [ ] Formulario de contacto y newsletter (backend + frontend).
- [ ] Panel `/admin`: dashboard, CRUD de sedes/servicios/barberos/productos/contenido, agenda, pedidos, mensajes.

## Fase 9 — Pulido (1 día)
- [ ] Animaciones y transiciones idénticas a la referencia.
- [ ] Responsive en 375 / 768 / 1024 / 1440 px.
- [ ] Accesibilidad (Lighthouse ≥ 90), SEO (helmet, sitemap, `LocalBusiness` JSON-LD), imágenes webp + lazy.

## Fase 10 — Deploy (½ día)
- [ ] MongoDB Atlas (cluster + usuario + IP allowlist).
- [ ] API en Render con variables de entorno; webhook de Stripe apuntando a Render.
- [ ] Cliente en Vercel con `VITE_API_URL`.
- [ ] CI en GitHub Actions: lint + typecheck + tests en cada PR.

---

## Comandos que va a tener el proyecto

```bash
npm install              # instala todo (workspaces)
docker compose up -d     # levanta MongoDB local
npm run seed             # carga datos de ejemplo
npm run dev              # API :4000 + cliente :5173
npm run test             # Vitest en todos los paquetes
npm run test:e2e         # Playwright
npm run lint && npm run typecheck
npm run build
```

## Decisiones que necesito que confirmes

1. **Idioma**: ¿el clon en español (como el repo actual) o en inglés como el original?
2. **Marca**: seguimos con nombre/logo propios (recomendado) — ¿qué nombre usamos?
3. **Pagos**: ¿Stripe en modo test alcanza, o preferís Mercado Pago?
4. **Estructura**: ¿OK renombrar `frontend/` → `client/` y `backend/` → `server/`?
