# V4 · V5 · V7 — Alta de una barbería nueva, kit de entrega y monitoreo

## A. Alta repetible (objetivo: menos de 1 hora)
Probado de cero el 08/11/2026 en una base vacía: `npm run provision` tardó **2,8 s**, la API arrancó en modo producción con los secretos generados en **2,2 s** y `tools/smoke.mjs` dio 6/6 verificaciones OK. Lo que lleva tiempo son las cuentas externas (≈ 30–40 min).

| # | Paso | Quién | Tiempo |
|---|---|---|---|
| 1 | Crear cuentas **a nombre del cliente**: MongoDB Atlas, Render, Vercel (o solo Render), dominio | cliente/usuario | 15–20 min |
| 2 | En Atlas: cluster, usuario de base, acceso de red (`0.0.0.0/0` solo si Render no tiene IP fija), copiar `MONGO_URI` | usuario | 5 min |
| 3 | Copiar `docs/cliente.ejemplo.json` a `cliente.json` (está en `.gitignore`) y completarlo: negocio, WhatsApp, dueño, sede, horarios, servicios, barberos | usuario | 5 min |
| 4 | `npm ci` y luego `MONGO_URI="<atlas>" npm run provision -- cliente.json --secrets cliente.env.generated` → crea todo, muestra la contraseña del dueño **una vez** y genera `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `LINK_SECRET` al azar | usuario | 1 min |
| 5 | Render → Web Service con este repo (`render.yaml` como guía): cargar las variables del archivo generado + `CLIENT_URL` y `PUBLIC_API_URL`; **borrar `cliente.env.generated`** | usuario | 10 min |
| 6 | Vercel (o Render estático): variable `VITE_API_URL=https://<api>/api/v1`; editar en `vercel.json` el `connect-src` y `img-src` si la API no es `*.onrender.com` | usuario | 5 min |
| 7 | Editar `client/public/.well-known/security.txt` (contacto y dominio reales) | usuario | 2 min |
| 8 | `npm run smoke -- https://<api>/api/v1 https://<sitio>` → debe terminar «Todo bien» | usuario | 1 min |
| 9 | Ingresar como dueño, cambiar la contraseña, activar 2FA (Configuración → Seguridad), cargar fotos | dueño | 10 min |
| 10 | Variables del repo en GitHub (Settings → Variables): `API_URL`, `SITE_URL` para el chequeo de caídas; secretos `MONGO_URI` y `BACKUP_PASSPHRASE` para el backup semanal | usuario | 5 min |

**Reglas:** una base, un servicio y un juego de secretos por cliente; nunca compartir secretos entre clientes; Mercado Pago, WhatsApp y factura se conectan **al final** con las credenciales del cliente (ver [MERCADOPAGO.md](MERCADOPAGO.md)).

## B. Checklist de traspaso (el día de la entrega)
- [ ] Dominio a nombre del cliente (registrante y DNS).
- [ ] Cuentas de Atlas, Render y Vercel del cliente; el estudio queda como colaborador (no como dueño).
- [ ] Repositorio en la cuenta de GitHub del cliente (o copia entregada) con `main` protegida.
- [ ] Contraseña del dueño cambiada, 2FA activo, y el código de recuperación guardado por el cliente.
- [ ] Backup restaurado una vez en una base de prueba con el cliente delante ([BACKUPS.md](BACKUPS.md)).
- [ ] `security.txt` con el contacto real; política de privacidad y términos publicados (ver [PENDIENTES-USUARIO.md](PENDIENTES-USUARIO.md)).
- [ ] Manuales entregados ([MANUAL-DUENO.md](MANUAL-DUENO.md), [MANUAL-BARBERO.md](MANUAL-BARBERO.md)) y capacitación hecha.
- [ ] Contrato de mantenimiento firmado (alcance, tiempos de respuesta, qué no incluye).

## C. Runbook: «qué hago si se cae»
1. **Mirar qué cae:** abrir `https://<api>/api/v1/health` (API) y `/health/ready` (API + base). El chequeo de GitHub (workflow *Uptime*) manda mail al fallar.
2. **La API no responde (502/timeout):** Render → servicio → *Logs*. Causas típicas: variable faltante (en producción la API se niega a arrancar sin `MONGO_URI`, `CLIENT_URL`, `PUBLIC_API_URL` y los 3 secretos), Atlas pausado o sin acceso de red, plan gratuito dormido (primer pedido tarda ~30 s: pasar al plan *Starter*).
3. **`/health` anda pero `/health/ready` da 503:** problema con Atlas. Revisar que el cluster no esté pausado, que la IP esté permitida y que la clave no haya cambiado.
4. **El sitio abre en blanco:** abrir la consola del navegador; si dice `Refused to … Content Security Policy`, la API nueva no figura en `connect-src` de `vercel.json`.
5. **Mercado Pago no confirma señas:** mirar el log por `Firma inválida` (secreto `MP_WEBHOOK_SECRET` mal copiado) o en Auditoría los avisos «revisar a mano» (monto menor o turno ya cancelado: reembolsar o reubicar).
6. **Rollback:** Render → *Deploys* → desplegar el anterior; Vercel → *Deployments* → *Promote*.
7. **Datos dañados:** restaurar el último backup en una base nueva (nunca sobre la actual), apuntar `MONGO_URI` a esa base y validar. Pasos en [BACKUPS.md](BACKUPS.md).
8. Registrar el incidente (hora, causa, qué se hizo) y avisar al cliente por escrito dentro de los tiempos del contrato.

## D. Monitoreo (V7)
- **Caídas:** `.github/workflows/uptime.yml` consulta cada 10 min `API_URL/health/ready` y `SITE_URL`; si falla, GitHub avisa por mail. También mantiene despierta una API gratuita (pero la recomendación es el plan *Starter* de Render, que no se duerme).
- **Errores 500:** poner `ERROR_WEBHOOK_URL` (Slack, Discord, Better Stack…) y cada error interno se avisa con método, ruta y mensaje, sin datos personales.
- **Pendiente del usuario:** abrir una cuenta de uptime externa (UptimeRobot, Better Stack o similar) si el cliente quiere aviso por WhatsApp/SMS, y Sentry si se quiere traza completa. No se pueden crear cuentas desde acá.
- **Cold start:** medido en local, la API tarda 2,2 s en arrancar y 125 ms la primera consulta. Los ~33 s observados vienen del plan gratuito de Render al «despertar»; con el plan *Starter* (`render.yaml`) o el chequeo cada 10 min no se produce. Objetivo < 5 s cumplido **solo con plan que no duerme**.
