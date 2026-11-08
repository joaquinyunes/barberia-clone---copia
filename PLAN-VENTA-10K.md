# Barbería (Jack el Barbero) — plan de venta (actualizado 08/11/2026)
Leé primero `..\PLAN-VENTA-10K.md` (veredicto, paquetes **S** y **V**). Trabajo hecho en la rama `integracion` (desde `feat/backoffice-turnos`).

**Frase de venta (a validar):** «Turnos online para barberías: lista de espera, recordatorios, comisiones por barbero, membresías y gift cards, sin pagar una cuota por barbero.» Competidor: AgendaPro (precio vigente tomado de agendapro.com/ar/planes el 08/11/2026, ver [docs/COSTO-3-ANIOS.md](docs/COSTO-3-ANIOS.md)).

> **Lo que dice la tabla de costos (sin maquillar):** a 3 años, AgendaPro cuesta ≈ USD 340–550 con 3 barberos y ≈ USD 4.400 con 8; este sistema cuesta USD 6.740 (Instalación + Mensual) o USD 12.880 (Completo). **Por ahorro no se vende**; se vende por datos y código propios, integraciones locales y cuota que no crece por barbero. El USD 10.000 solo se justifica para cadenas (≈ 26 barberos contra el Completo, ≈ 13 con Instalación + Mensual) y hay que validarlo con un comprador real.

## Verificación real (corrida el 08/11/2026, Node 24, Mongo 8.2 local)
| Chequeo | Resultado |
|---|---|
| `npm run typecheck` (servidor y cliente) | 0 errores |
| `npm test` servidor | **100/100** (17 archivos; antes 50/50) |
| `npm test` cliente | **14/14** (5 archivos) |
| `npm run lint` | 0 avisos |
| `npm run build` (servidor y cliente) | OK |
| `npm audit --omit=dev` | **0 vulnerabilidades** (antes 0 críticas / 4 altas / 2 moderadas) |
| `npm audit` completo (incluye desarrollo) | 7 moderadas, solo herramientas de desarrollo (cadena de `typescript-eslint`); no entran en producción |
| Arranque en frío de la API (local) | 2,2 s hasta la primera respuesta; 125 ms la primera consulta con base |
| Alta de cliente nuevo desde cero (base vacía → API en producción → `smoke`) | `provision` 2,8 s; `smoke` 6/6 OK |
| `backup:verify` | 28 colecciones, 6.813 documentos restaurados idénticos |
| Revisión de seguridad independiente | 14 hallazgos verificados: 2 altas, 6 medias y 3 bajas corregidas con prueba; 3 parciales o documentadas (ver docs/SEGURIDAD.md) |
| CSP en modo bloqueo | home, reservar e ingresar cargan sin violaciones en el navegador (cabeceras reales de `vercel.json`) |

## A. Pasos
- [x] **B1** 🤖 Integrar: rama `integracion` con `feat/diseno-a11y` y `chore/seguridad-ci` fusionadas sin conflictos; tests, builds y typecheck verdes (cifras arriba). Se arregló además el CI, que corría `npm test` sin Mongo.
- [x] **B2** 🤖 S1: `multer` 2.5.0, `zod` 4.6.7, `body-parser` 2.4.0 y `follow-redirects` 1.16.2 por lockfile; `npm audit --omit=dev` = 0.
- [x] **B3** 🤖 WP-13 Mercado Pago: firma `x-signature` (401 sin firma/inválida/de otro pago), idempotencia con índice único (6 avisos simultáneos → una sola seña), monto y estado validados, pagos huérfanos a «revisar a mano», 10 + 7 pruebas con el SDK simulado, guía de sandbox en [docs/MERCADOPAGO.md](docs/MERCADOPAGO.md). **Falta (👤 B12):** probarlo con credenciales de prueba reales y comparar `render.yaml` con el servicio vivo.
- [x] **B4** 🤖 Doble reserva imposible: candado por sede + chequeo de solapamiento posterior + índice único `uniq_active_slot`; tests con 10 y 6 pedidos simultáneos, turnos que se pisan con distinto inicio y reprogramaciones simultáneas → un solo ganador. Límite documentado: el candado en memoria vale para una instancia de API; con varias quedan el índice único y el chequeo posterior.
- [x] **B5** 🤖 Seguridad de cuentas: S2, S3, S4, S5, S7, S8, S9, S10, S11, S13 hechos (ver abajo y [docs/SEGURIDAD.md](docs/SEGURIDAD.md)). S12 hecho en lo técnico; el texto legal es 👤. Los links de reserva: expiran (30 días; receipts 7 días), la cancelación es terminal (un link no puede cancelar dos veces) y toda la gestión está limitada por tasa. La reprogramación sigue siendo repetible a propósito.
- [x] **B6** 🤖 Reseñas verificadas + encuesta NPS (solo turnos realizados, una por turno, nombre de pila) · campañas con consentimiento (opt-in explícito, baja por link, link de WhatsApp solo para quienes aceptaron) · galería por barbero (campo y API) · puntos canjeables (atómicos) · QR en gift cards (solo personal, para que no sirva de oráculo de códigos) · propina online por Mercado Pago. Con pruebas. **Límite:** el envío masivo no es automático (solo arma links); la galería se carga por URL.
- [ ] **B7** 🤖 (parcial: código y pruebas hechos; falta ver el service worker en un celular real y la suscripción en sandbox) Cobro recurrente de membresía con Mercado Pago (suscripción `preapproval` + cuotas por webhook, con pruebas simuladas) · PWA (manifest, ícono, service worker; el registro del service worker no se pudo comprobar en el navegador integrado, falta verlo en un celular — 👤). **Falta (👤):** verificar la suscripción en sandbox.
- [x] **B8** 🤖 Factura electrónica: solo la interfaz (`FacturacionProvider`, comprobante interno no fiscal, `FACTURACION_PROVIDER`), con prueba de contrato. El proveedor certificado es 👤.
- [x] **B9** 🤖 Cold start: ruta liviana `/health` y `/health/ready`, workflow *Uptime* cada 10 min, `render.yaml` en plan *Starter*. Medido en local: 2,2 s; los ~33 s son del plan gratuito de Render al despertar. Objetivo < 5 s cumplido **solo con plan que no duerme** (👤 B11 contratarlo).
- [ ] 👤 **B10** Atlas: `MONGO_URI`; mantener `CLIENT_URL`, `PUBLIC_API_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `LINK_SECRET` (≥ 16).
- [ ] 👤 **B11** API de Render sin dormirse + front en Render estático y Vercel.
- [ ] 👤 **B12** `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` (al final) · privacidad y términos.

## S — Seguridad (resumen; detalle en `docs/SEGURIDAD.md`)
- [x] S1 0 altas/críticas en producción · [x] S2 CSP en bloqueo (`vercel.json` y `render.yaml`; `style-src 'unsafe-inline'` queda por los estilos en línea de React/Framer Motion, scripts solo `'self'`) · [x] S3 límites por IP + bloqueo de cuenta (5 fallos → 15 min) · [x] S4 contraseñas del personal ≥ 12, 2FA TOTP con secreto cifrado, cierre de sesión en todos los dispositivos (ya existía), cookie `HttpOnly; Secure; SameSite=None` en producción por el front en otro dominio · [x] S5 zod en el borde, rechazo de operadores `$` y `.`, body 1 MB, comprobantes 5 MB con tipo real por firma de bytes · [x] S6 webhooks · [x] S7 auditoría inmutable + roles existentes · [x] S8 sin secretos en el historial (escaneo de 27 commits; ver hallazgo en SEGURIDAD.md), `server/.env.example` sin valores · [x] S9 CORS cerrado, HSTS, Permissions-Policy, `security.txt` (con texto a completar 👤) · [ ] S10 (parcial) backup + restauración probada **en local** (falta probarla con el Atlas real 👤) · [x] S11 Dependabot semanal agrupado + `npm audit` en CI · [ ] S12 técnica hecha (exportar/anonimizar, consentimiento, logs sin datos personales ni tokens), política y términos 👤 · [x] S13 revisión: ver docs/SEGURIDAD.md.

## B. Para vender (de `..\PLAN-VENTA-10K.md` §4)
- [x] V1 paquetes ([docs/PAQUETES-Y-PRECIOS.md](docs/PAQUETES-Y-PRECIOS.md)) · [x] V2 tabla a 3 años contra AgendaPro para 3 y 8 barberos, con precio vigente y fuente ([docs/COSTO-3-ANIOS.md](docs/COSTO-3-ANIOS.md)) · [ ] V3 demo aparte (👤) · [x] V4 despliegue repetible (`npm run provision` + `npm run smoke`, probado de cero; [docs/ENTREGA.md](docs/ENTREGA.md)) · [ ] V5 (parcial) manual del dueño y del barbero + runbook + checklist de traspaso ([MANUAL-DUENO.md](docs/MANUAL-DUENO.md), [MANUAL-BARBERO.md](docs/MANUAL-BARBERO.md)); **capturas y video quedan 👤** (necesitan el sistema real del cliente) · [ ] V7 (parcial) uptime y errores (workflow *Uptime*, `/health/ready`, `ERROR_WEBHOOK_URL`); la cuenta externa de uptime/Sentry es 👤 · [x] V8 página de venta (`ventas/index.html`; demo y caso real figuran como «en preparación», sin testimonios inventados) · [ ] V10 barbería piloto (👤)
- [x] **Extra** Reporte «qué barbero rinde» (ya existía: Reportes → ranking) y «clientes que no vuelven hace N días» (Fidelización → No vuelven, 45 por defecto). Importar clientes por CSV (Fidelización → Importar clientes; con pruebas). **Falta:** importar la agenda/turnos históricos (no hecho: riesgo de fechas y solapamientos sin un caso real que lo guíe).

## Salida
☑ integrado · ☑ tests (100 + 14) y 2 builds verdes · ☑ 0 altas/críticas en producción · ☐ reserva con seña de prueba en sandbox real (👤) · ☐ API < 5 s en frío en producción (👤 plan que no duerme) · ☐ backup restaurado en Atlas real (👤) · ☐ barbería piloto (👤)

La lista completa de lo que solo puede hacer el usuario está en [docs/PENDIENTES-USUARIO.md](docs/PENDIENTES-USUARIO.md).

> ⚠ El repositorio de GitHub es **público**: conviene hacerlo privado antes de ofrecer el producto o activar el backup en GitHub (ver docs/SEGURIDAD.md, «Decisión tuya»).
