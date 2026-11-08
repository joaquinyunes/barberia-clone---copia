> Archivo vivo: qué se hizo y qué falta en este proyecto. Misma base que `soluciones-repos/ESTADO-PROYECTOS/barberia-clone.md` (31/10/2026). Cada sesión lo actualiza al terminar.

# barberia-clone (Jack el Barbero, MERN) — rama `feat/backoffice-turnos` · `6948b26`

## Hecho
- Back-office versión 2: «lo mismo que la última vez» (`/me/client/last-cut`), clientes en riesgo con WhatsApp en 1 clic, lista de espera (modelo, rutas, formulario y pantalla de admin), recordatorios (`reminder.service`), reporte de comisiones, membresía con consumo por cupo, gift cards (venta, saldo, canje parcial). Informó 50 tests contra Mongo con replica set (no re-ejecutados). `render.yaml`, `docs/BACKOFFICE.md`, `docs/DEPLOY.md`. **Commiteado hoy** (30 archivos sueltos).
- Seguridad: en producción exige `MONGO_URI`, `CLIENT_URL`, `PUBLIC_API_URL` (commit `a78cc8f` en `main`).

## Falta (código)
- **WP-13:** verificar Mercado Pago (firma del webhook, idempotencia, tests, guía sandbox).
- Reseñas verificadas, encuesta, campañas masivas, fotos del corte, galería por barbero, puntos canjeables, cobro recurrente de membresía, QR de gift cards, propina online, PWA, asistente de WhatsApp, fila virtual.
- Factura electrónica: fuera de alcance (proveedor certificado).
- 46 de 70 controles táctiles chicos (WP-41).

## Te toca a vos
1. Atlas (si ya tenés cluster, solo `MONGO_URI` en el servicio de Render).
2. **Arranque en frío de 33 s** de `jack-el-barbero-api` (plan gratis). Con la regla del dueño: front estático en Render (ya lo es) **y** en Vercel; la API necesita plan que no se duerma, porque el plan gratis corta la reserva en curso.
3. `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET`: al final (credenciales de prueba primero).
4. Cupo es un producto aparte (decisión): no mezclar.

## Plataformas hoy
Render: `jack-el-barbero-web` (static) y `jack-el-barbero-api` (web gratis). No tiene Vercel.
