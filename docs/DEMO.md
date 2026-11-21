# V3 — Entorno de demo separado

**Regla:** el entorno real de un cliente **nunca** se usa para mostrar. La demo es otra instalación, con otra base y datos de ejemplo.

## Qué hace `DEMO_MODE=true` (verificado por pruebas, `server/tests/demo.test.ts`)
- `/public/site` devuelve `demo: true` y el sitio muestra un **cartel rojo fijo «DEMO · datos de ejemplo · no se cobra ni se envía ningún mensaje»** (`DemoBanner`).
- **No se cobra:** Mercado Pago queda apagado aunque haya credenciales cargadas (`/site` informa `mercadoPago: false`, crear un link de pago responde 503) y el webhook se ignora.
- **No se envía nada:** recordatorios y avisos de lista de espera solo quedan en el log, aunque se haya registrado un canal real.

## Cómo levantarla (≈ 20 min, 👤 porque necesita cuentas)
1. Un cluster/base de Atlas **distinto** del de cualquier cliente (por ejemplo `jack-demo`).
2. Un servicio de Render aparte (`jack-el-barbero-demo-api`) con `NODE_ENV=production`, `DEMO_MODE=true`, `MONGO_URI` de la base de demo, `CLIENT_URL`, `PUBLIC_API_URL` y los 3 secretos. **Sin** `MP_*`, `ERROR_WEBHOOK_URL` ni proveedor de factura.
3. Cargar los datos de ejemplo: `MONGO_URI=<base de demo> npm run seed -w server -- --force` (borra la base; los usuarios de ejemplo salen impresos al final).
4. Sitio de demo (Vercel o Render estático) apuntando a esa API; avisar de `connect-src` en `vercel.json` si el host no es `*.onrender.com`.
5. `npm run smoke -- <api>/api/v1 <sitio>` y mirar que el cartel aparezca.
6. Opcional: reiniciar la base cada 12 h con un cron que repita el paso 3, para que nadie la deje sucia.

## Lo que NO es la demo
No es un caso real: la landing de ventas la nombra «entorno de demo» y el «caso real» sigue vacío hasta que haya un piloto (V10).
