# Despliegue y variables de entorno

Base de datos en **MongoDB Atlas**, API en **Render** (`render.yaml`) y sitio en **Vercel** (`vercel.json`).
Este repo **no versiona ningún `.env` ni `.env.example`**: los valores se cargan a mano en cada servicio
(Render → *Environment*, Vercel → *Settings → Environment Variables*, y un `server/.env` local que está en `.gitignore`).
Esta tabla lista solo los **nombres**; nunca pegues valores acá.

## Servidor (Render o `server/.env` local)

| Variable | Obligatoria | Para qué sirve |
|---|---|---|
| `NODE_ENV` | sí | `production` en Render. En producción el servidor se niega a arrancar con valores de desarrollo. |
| `PORT` | no | Puerto de la API (Render lo define solo). |
| `MONGO_URI` | sí en producción | Cadena de conexión a MongoDB Atlas. |
| `CLIENT_URL` | sí en producción | URL pública del sitio (CORS y links dentro de los avisos). |
| `PUBLIC_API_URL` | sí en producción | URL pública de esta API (links firmados a comprobantes). Si falta, usa `RENDER_EXTERNAL_URL`. |
| `JWT_ACCESS_SECRET` | sí en producción | Firma de sesiones (mínimo 16 caracteres, único por entorno). |
| `JWT_REFRESH_SECRET` | sí en producción | Firma del refresco de sesión (distinto del anterior). |
| `LINK_SECRET` | sí en producción | Firma de links de gestión de reservas y comprobantes. |
| `UPLOAD_DIR` | no | Carpeta de comprobantes subidos (por defecto `uploads`). |
| `BUSINESS_UTC_OFFSET` | no | Huso horario del negocio, formato `-03:00`. |
| `MP_ACCESS_TOKEN` | no | Mercado Pago. Lo cubre otro paquete de trabajo (WP-13). |
| `MP_WEBHOOK_SECRET` | no | Mercado Pago, firma del webhook (WP-13). |

## Cliente (Vercel o `client/.env` local)

| Variable | Obligatoria | Para qué sirve |
|---|---|---|
| `VITE_API_URL` | sí | URL base de la API, terminada en `/api/v1`. |

## Variables nuevas de este cambio

Ninguna. Los avisos de la lista de espera y los recordatorios salen por una interfaz (`server/src/lib/notify/notifier.ts`)
que por defecto **no envía nada** y solo deja constancia en el log. Cuando se conecte la API oficial de WhatsApp,
sus credenciales se agregan acá como filas nuevas de la tabla del servidor.

## Local

```bash
npm install
docker compose up -d mongo   # o MONGO_URI con Atlas
npm run seed                 # carga datos de ejemplo (borra la base)
npm run dev
```

## Pruebas con replica set

La suite del servidor usa la base indicada en `MONGO_TEST_URI` (por defecto `mongodb://127.0.0.1:27017/jeb-test`).
Para probar contra un Mongo con replica set local, levantar `mongod --replSet rs0` en otro puerto, inicializarlo con
`replSetInitiate` y apuntar `MONGO_TEST_URI` a `mongodb://127.0.0.1:<puerto>/jeb-test?replicaSet=rs0`.
