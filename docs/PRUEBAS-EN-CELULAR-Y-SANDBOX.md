# Lo que falta probar con dispositivos y cuentas reales (B7, CSP)

Todo lo verificable por código ya está probado (se detalla abajo). Esto es **exactamente** lo que queda y cómo comprobarlo, con el resultado esperado.

## 1. PWA en un celular real (B7) — 10 min
**Ya verificado por código:** `client/src/test/sw.test.ts` simula el service worker: guarda el cascarón al instalar; sin conexión abre el cascarón; **nunca** toca `/api`, otros orígenes ni pedidos que no son GET; los archivos con hash se sirven del caché; el manifest trae `display: standalone`, `scope`, `start_url` e ícono. La CSP permite `worker-src 'self'` y `manifest-src 'self'` (`client/src/test/csp.test.ts`). En el navegador integrado de esta sesión el manifest carga pero el registro del service worker fue rechazado (es una limitación de ese navegador, no se pudo concluir nada).

**Falta (en un celular, con el sitio desplegado por HTTPS):**
1. Android/Chrome: abrir el sitio → menú → *Instalar app* (o aviso «Agregar a la pantalla de inicio»). Esperado: ícono dorado «J» y apertura sin barra del navegador. iPhone/Safari: *Compartir → Agregar a inicio*.
2. Chrome de escritorio → DevTools → *Application → Service Workers*: estado **activated and running**; *Manifest*: sin advertencias.
3. Modo avión → abrir la app instalada: debe verse el cascarón (no la pantalla de «sin internet»); al volver la conexión, las páginas cargan normales y las llamadas a la API (reservar, ingresar) funcionan.
4. Publicar un cambio: la app instalada debe mostrar la versión nueva a la segunda apertura (las páginas van por red primero). Si no, subir `CACHE = "jack-v2"` en `client/public/sw.js`.
5. Anotar fecha, dispositivo y resultado acá.

> Los íconos son SVG (`sizes: "any"`). Chrome los acepta; si un dispositivo antiguo pidiera PNG 192/512, generarlos con `tools/image-convert` desde `client/public/icon.svg`.

## 2. Cobro mensual de membresía en sandbox de Mercado Pago (B7) — 30 min
**Ya verificado por código** (`server/tests/engagement.test.ts`, SDK simulado): iniciar la suscripción devuelve el link; el aviso `authorized` crea **una sola** membresía (también con dos avisos simultáneos); un cobro que llega antes que la autorización devuelve 409 y el reintento lo procesa; el primer cobro se registra sin extender y los siguientes renuevan 30 días; `cancelled` cancela; el cliente no puede suscribirse dos veces.

**Falta (necesita `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` de prueba — ver [MERCADOPAGO.md](MERCADOPAGO.md)):**
1. Con un cliente con cuenta: *Mi cuenta → «Suscribite a una membresía» → Suscribirme* (solo aparece con Mercado Pago activado; equivale a `POST /me/client/membership/checkout`). Esperado: respuesta con `initPoint` de `sandbox`/`mercadopago.com`.
2. Pagar con el **usuario comprador de prueba**. Esperado en la base: 1 documento en `memberships` con `mpPreapprovalId`, `status: active`, `renewsAt` a 30 días; 1 documento en `paymentevents` por cada cobro; movimiento «Membresía (cobro automático)» en Caja.
3. Reenviar el aviso desde el panel de Webhooks de Mercado Pago: **no** debe aparecer un segundo movimiento ni una segunda membresía.
4. Confirmar que el cobro mensual llega como notificación `payment` con `external_reference` = `membership:<clienteId>:<planId>` (así lo asume el código; si el de prueba trae otro formato, ajustar `handleNotification` en `mercadopago.service.ts`, rama `membership`).
5. Cancelar la suscripción desde Mercado Pago: la membresía debe pasar a `cancelled`.
6. Confirmar que el `x-signature` real valida (si responde 401 con el secreto correcto, revisar el armado del manifest en `verifySignature`).

## 3. CSP en bloqueo y el host real de la API — confirmado y asentado
- **Qué se verificó por código** (`client/src/test/csp.test.ts`, 5 pruebas): `vercel.json` y `render.yaml` aplican **exactamente la misma** política; no queda ninguna directiva «solo reporte»; `connect-src` e `img-src` cubren `https://jack-el-barbero-api.onrender.com` (el servicio que declara `render.yaml`) por el comodín `https://*.onrender.com`; una API en otro dominio **no** queda cubierta (por eso `ENTREGA.md` paso 6 manda agregarla al dar de alta un cliente).
- **Qué se verificó en vivo** (08/11/2026): home, reservar e ingresar cargan sin violaciones con las cabeceras reales de `vercel.json`.
- **Estado del despliegue (09/11/2026):** consulté la cuenta de Vercel (`joaquinyunes-projects`, 15 proyectos): **no existe ningún proyecto de Vercel para Barbería** (ni por nombre ni por el repositorio `joaquinyunes/barberia-clone---copia`). Por lo tanto el push a `main` **no despliega nada en Vercel** y la CSP no puede dejar en blanco un sitio que hoy no está allí.
- **No pude confirmar** el host real de la API en Render: la cuenta pide elegir un espacio de trabajo y eso lo decide el usuario. **Antes de conectar el sitio a una API:** copiar el dominio exacto de la API y comprobar que cae en `https://*.onrender.com`; si es un dominio propio, agregarlo en `connect-src` e `img-src` **de `vercel.json` y de `render.yaml`** (el test falla si quedan distintos) y correr `npm run smoke -- <api> <sitio>`.
- Recomendación de endurecimiento: reemplazar el comodín `*.onrender.com` por el host exacto de cada cliente (cierra la exfiltración hacia subdominios ajenos de Render).
