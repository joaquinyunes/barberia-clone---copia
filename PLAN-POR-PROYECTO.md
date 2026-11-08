# Plan de este proyecto (copia del 02/11/2026)

> Sacado de `soluciones-repos/PLAN-POR-PROYECTO.md` (la maestra, con tablero y reglas de todas las sesiones). Marcá `[x]` acá y en la maestra. Reglas: sin `git push`, sin secretos, credenciales de prueba al final, no tocar `veterinaria-system`.

## 4. barberia-clone (Jack el Barbero)
Ramas: base `main` `a78cc8f` · `feat/backoffice-turnos` `6948b26` · `feat/diseno-a11y` `e461da3` · `chore/seguridad-ci` `36ba785`.
Hecho: lista de espera, «lo mismo que la última vez», recordatorios, comisiones, membresía y gift cards; diseño (movimiento reducido, 44 px, etiquetas); encabezados y CI.

- [ ] 1 🤖 **Integrar**. Verif.: tests del servidor (≥50), `npm run build -w client`, `npm run build -w server`.
- [ ] 2 🤖 **WP-13** verificar Mercado Pago: firma del webhook con `MP_WEBHOOK_SECRET`, idempotencia, tests que falten, guía de sandbox. Confirmar que `render.yaml` coincide con el servicio vivo.
- [ ] 3 🤖 Reseñas verificadas + encuesta · campañas por WhatsApp/email · fotos del corte y galería por barbero · puntos canjeables · QR en gift cards · propina online.
- [ ] 4 🤖 Cobro recurrente de membresía con Mercado Pago · PWA instalable (manifest + service worker).
- [ ] 5 🤖 Factura electrónica: solo interfaz (proveedor certificado).
- [ ] 6 👤 Atlas: `MONGO_URI`, y mantener `CLIENT_URL`, `PUBLIC_API_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `LINK_SECRET` (≥16 caracteres).
- [ ] 7 👤 La API de Render arranca en 33 s (plan gratis, corta la reserva en curso): plan que no se duerma. Front: Render estático (ya está) + Vercel.
- [ ] 8 👤 `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` (al final) · privacidad y términos.

Salida: ☐ integrado ☐ tests y 2 builds verdes ☐ reserva con seña de prueba en sandbox ☐ API responde en < 5 s en frío.

Pasos 🤖 = los hace una sesión. 👤 = solo el dueño.
