# Barbería (Jack el Barbero) — plan de venta (actualizado 21/11/2026)
Leé primero `..\PLAN-VENTA-10K.md` (veredicto, paquetes **S** y **V**). Todo lo de abajo está en `main`.

**Frase de venta (a validar):** «Turnos online para barberías: lista de espera, recordatorios, comisiones por barbero, membresías y gift cards, sin pagar una cuota por barbero.» Competidor: AgendaPro (precios leídos de agendapro.com/ar/planes el 20/11/2026; ver [docs/COSTO-3-ANIOS.md](docs/COSTO-3-ANIOS.md)).

> **Lo que dice la tabla de costos (sin maquillar):** a 3 años AgendaPro cuesta ≈ USD 575–1.040 con 3 barberos y ≈ USD 1.500–1.960 con 8 (Básico/Premium); este sistema cuesta USD 6.740 (Instalación + Mensual) o USD 12.880 (Completo). **Por ahorro no se vende**: el equilibrio llega con ≈ 29–31 barberos (Instalación + Mensual) o ≈ 56 (Completo). Se vende por datos y código propios, integraciones locales y cuota que no crece por barbero, y hay que validarlo con un comprador real antes de pedir USD 10.000.

## Verificación real (21/11/2026, Node 24, Mongo 8.2 local)
| Chequeo | Resultado |
|---|---|
| `tsc` (servidor y cliente) | 0 errores |
| Pruebas del servidor | **166/166** (33 archivos; al empezar eran 50) |
| Pruebas del cliente | **23/23** (7 archivos; incluye CSP y service worker) |
| Lint | 0 avisos |
| Builds de servidor y cliente | OK |
| `npm audit --omit=dev` | **0 vulnerabilidades** (al empezar: 4 altas y 2 moderadas) |
| Revisiones de seguridad | 2 independientes (14 + 20 hallazgos, con prueba salvo los listados en `docs/SEGURIDAD.md`) y 1 adversaria propia (alcance por sede) |
| Arranque en frío (local) | 2,2 s; primera consulta con base, 125 ms. Los ~33 s vienen del plan gratuito de Render al despertar |
| Alta de un cliente nuevo desde cero | `provision` 2,8 s, `smoke` 6/6, API en producción 2,2 s |
| Backup | 28 colecciones / 6.813 documentos restaurados idénticos + 3 pruebas automáticas |

## A. Pasos
- [x] **B1** Integrar: ramas fusionadas sin conflictos; CI corregido (corría los tests sin Mongo).
- [x] **B2** S1: 0 altas/críticas en producción (multer, zod, body-parser, follow-redirects, mongoose 8.24.10).
- [x] **B3** Mercado Pago (WP-13): firma de webhook, idempotencia atómica, monto y estado validados, pagos huérfanos/devueltos a revisión, link que vence con la reserva, guía de sandbox ([docs/MERCADOPAGO.md](docs/MERCADOPAGO.md)); pruebas con el SDK simulado.
- [x] **B4** Doble reserva imposible: candado + chequeo de solapamiento + índice único; 10 pedidos simultáneos → un ganador; también turnos que se pisan y reprogramaciones.
- [x] **B5** Seguridad de cuentas: límites de tasa, bloqueo por cuenta+IP con espera creciente, 2FA (sin reuso, obligatorio para admin/encargado), rotación del refresh token con detección de reuso, auditoría inmutable, CSP en bloqueo, vínculo de ficha verificado, PIN de fichaje hasheado, alcance por sede ([docs/SEGURIDAD.md](docs/SEGURIDAD.md)).
- [x] **B6** Reseñas verificadas + encuesta NPS · campañas con consentimiento confirmado · galería por barbero · puntos canjeables · QR de gift card (solo personal) · propina online.
- [x] **B7** Cobro recurrente de membresía con Mercado Pago (cancelar corta el cobro; doble clic y doble suscripción cubiertos) y PWA (manifest, service worker). Verificado por código con el SDK y el service worker simulados; **falta el celular real y el sandbox** ([docs/PRUEBAS-EN-CELULAR-Y-SANDBOX.md](docs/PRUEBAS-EN-CELULAR-Y-SANDBOX.md)).
- [x] **B8** Factura electrónica: interfaz `FacturacionProvider` y comprobante interno no fiscal.
- [x] **B9** Cold start: `/health` liviano, `/health/ready`, workflow *Uptime* de precalentado y `render.yaml` en plan *Starter*. Medido: < 5 s solo con plan que no duerme.
- [ ] 👤 **B10** Atlas · [ ] 👤 **B11** Render sin dormirse + front en Render y Vercel · [ ] 👤 **B12** credenciales de Mercado Pago (primero de prueba).

## S — Seguridad
S1–S9, S11 y S13 hechos. S10 backup: herramienta + pruebas automáticas + restauración local ([docs/BACKUPS.md](docs/BACKUPS.md)); falta la prueba con el Atlas real (👤). S12: exportar/anonimizar, consentimiento y logs sin datos personales hechos; **el texto legal definitivo es del abogado** (👤). Detalle y límites (transacciones multi-documento) en `docs/SEGURIDAD.md`.

## V — Para vender
- [x] **V1** paquetes ([docs/PAQUETES-Y-PRECIOS.md](docs/PAQUETES-Y-PRECIOS.md)).
- [x] **V2** tabla a 3 años contra AgendaPro para 3 y 8 barberos con precio vigente y fuente ([docs/COSTO-3-ANIOS.md](docs/COSTO-3-ANIOS.md)). Los precios **cambiaron entre el 08/11 y el 20/11**: volver a leer la página el día que se muestre.
- [x] **V3** entorno de demo: `DEMO_MODE` (cartel DEMO, Mercado Pago apagado, ningún aviso real; `tests/demo.test.ts`). Levantar la instancia aparte es 👤 ([docs/DEMO.md](docs/DEMO.md)).
- [x] **V4** despliegue repetible: `npm run provision` + `npm run smoke`, probado de cero ([docs/ENTREGA.md](docs/ENTREGA.md)).
- [x] **V5** manual del dueño y del barbero, runbook, checklist de traspaso y guion con lista de tomas ([docs/GUION-VIDEO.md](docs/GUION-VIDEO.md)). Grabar capturas y videos es 👤.
- [x] **V7** uptime y errores: workflow *Uptime*, `/health/ready`, `ERROR_WEBHOOK_URL`. Cargar las variables del repo y abrir una cuenta de uptime externa es 👤.
- [x] **V8** página de venta (`ventas/index.html`; demo y caso real «en preparación», sin testimonios inventados).
- [x] **V10** kit del piloto: criterios, checklist, métricas y contrato borrador ([docs/KIT-PILOTO.md](docs/KIT-PILOTO.md)). **El piloto real y la firma con abogado son del usuario.**
- [x] **Extra** importar clientes **y agenda futura** por CSV (Fidelización → Importar), reporte «qué barbero rinde» (Reportes → ranking) y «clientes que no vuelven hace 45 días» (Fidelización).

## Salida
☑ integrado · ☑ 166 + 23 pruebas y builds verdes · ☑ 0 altas/críticas en producción · ☑ reserva con seña de prueba con el simulador de Mercado Pago en pruebas de integración · ☑ medición de cold start y plan documentados · ☐ seña de prueba en sandbox real (👤) · ☐ API < 5 s en frío en producción (👤 plan que no duerme) · ☐ backup restaurado en Atlas real (👤) · ☐ barbería piloto (👤)

Todo lo que solo puede hacer el usuario está en [docs/PENDIENTES-DEL-USUARIO.md](docs/PENDIENTES-DEL-USUARIO.md). ⚠ El repositorio de GitHub es **público**: conviene hacerlo privado antes de ofrecer el producto (ver `docs/SEGURIDAD.md`).
