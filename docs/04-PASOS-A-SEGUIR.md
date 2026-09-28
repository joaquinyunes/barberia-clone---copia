# 04 · Pasos a seguir (roadmap)

Cada fase termina con algo que funciona y un commit/PR propio. Nada se empieza sin que la fase anterior compile y pase los tests.

## Fase 0 — Auditoría visual y limpieza (½ día)
- [ ] Correr `tools/site-audit` y guardar screenshots desktop/mobile + `structure.json` de cada página. Se puede correr **en local** o en el entorno cloud **después de habilitar** `jacktheclipper.co.uk` en el acceso de red del entorno (hoy está bloqueado).
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
- [ ] `seed.ts` con datos propios de **Jack el Barbero** (3 sedes con WhatsApp, alias y seña; ~10 servicios; 6 barberos; 8 vouchers; slides; testimonios) en pesos argentinos.

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

## Fase 6 — Reservas + comprobante + WhatsApp (3 días) ⭐ ([doc 06](./06-RESERVAS-WHATSAPP-Y-PAGOS.md))
- [ ] `availability.service` + tests unitarios (bordes: cierre de la sede, turnos solapados, servicios largos, zona horaria `America/Argentina/Buenos_Aires`).
- [ ] `appointments` CRUD + índice anti doble-reserva + horario reservado 30 min + job que libera los vencidos.
- [ ] `payments`: subida de comprobante (Multer + Cloudinary), link firmado, aprobar/rechazar desde el admin.
- [ ] `lib/whatsapp`: `buildMessage` + `waLink` + endpoint `/payments/:kind/:id/whatsapp`.
- [ ] `BookingWizard` con los pasos (incluye Pago de seña y Enviar por WhatsApp), preselección desde `?location=` / `?service=`.
- [ ] "Mis reservas": ver, cancelar, reprogramar, agregar al calendario (`.ics`).
- [ ] E2E Playwright: reservar → subir comprobante → link de WhatsApp correcto.

## Fase 7 — Tienda (2 días)
- [ ] Listado con filtros/orden, categoría, detalle, relacionados.
- [ ] `cartStore` persistente + CartDrawer + CartPage.
- [ ] Checkout con el **mismo flujo** de comprobante + WhatsApp (`kind = order`).
- [ ] `Voucher` con código único + QR, enviado al aprobar el pago; canje en el paso de reserva.

## Fase 7b — Mercado Pago (1–2 días)
- [ ] Checkout Pro para seña y tienda (`preference` + `notification_url`).
- [ ] Webhook con validación `x-signature` y consulta del pago por ID → confirmación automática.
- [ ] El mensaje de WhatsApp incluye el número de operación.
- [ ] E2E con las cuentas y tarjetas de prueba de Mercado Pago.

## Fase 8 — Contacto, newsletter y admin (1–2 días)
- [ ] Formulario de contacto y newsletter (backend + frontend).
- [ ] Panel `/admin`: dashboard, CRUD de sedes/servicios/barberos/productos/contenido, agenda, pedidos, mensajes.

## Fase 8b — Fidelización (versión 2, [doc 05](./05-COMPETENCIA-Y-FUNCIONES.md))
- [ ] Lista de espera automática con aviso por WhatsApp.
- [ ] Ficha del cliente con fotos y notas + "repetir mi último corte".
- [ ] "Ya te toca el corte" (recordatorio según frecuencia).
- [ ] Club Jack (suscripción Mercado Pago), puntos y referidos, reseñas verificadas, portfolio por barbero.

## Fase 9 — Pulido (1 día)
- [ ] Animaciones y transiciones idénticas a la referencia.
- [ ] Responsive en 375 / 768 / 1024 / 1440 px.
- [ ] Accesibilidad (Lighthouse ≥ 90), SEO (helmet, sitemap, `LocalBusiness` JSON-LD), imágenes webp + lazy.

## Fase 10 — Deploy (½ día)
- [ ] Dominio propio (ej. `jackelbarbero.com.ar`, registrarlo en NIC Argentina).
- [ ] MongoDB Atlas (cluster + usuario + IP allowlist).
- [ ] API en Render con variables de entorno; webhook de Mercado Pago apuntando a Render.
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

## Fase 11 — Versión 3 (a futuro)
- [ ] Fila virtual para quienes vienen sin turno, con tiempo de espera en vivo.
- [ ] WhatsApp Cloud API: confirmaciones y recordatorios automáticos + asistente en el chat.
- [ ] Probador de cortes con IA, happy hour de horarios, reservas grupales, propina digital, PWA, métricas.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Idioma | Español (Argentina) |
| Marca | **Jack el Barbero** |
| Pagos | Transferencia + comprobante primero; **Mercado Pago** después |
| Aviso de reservas/pedidos | WhatsApp de la sede con todos los datos + comprobante |
| Carpetas | `frontend/` → `client/`, `backend/` → `server/` (con `git mv`) |

## Pendiente de tu lado
- Números de WhatsApp, direcciones, horarios, alias/CBU y monto de seña de cada sede (mientras tanto, datos de ejemplo).
- Rotar la API key de Google Maps expuesta.
- Habilitar el dominio de referencia en el acceso de red del entorno (o correr el script en tu PC) para la auditoría visual.
