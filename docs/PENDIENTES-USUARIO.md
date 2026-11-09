# Lo que solo puede hacer el usuario (👤)

Todo lo que se podía hacer sin credenciales ni cuentas está hecho y verificado (ver `PLAN-VENTA-10K.md`). Esto queda para vos, en este orden:

## Cuentas y credenciales (B10–B12)
1. **B10 — MongoDB Atlas:** crear el cluster, usuario y acceso de red; copiar `MONGO_URI`. Mantener `CLIENT_URL`, `PUBLIC_API_URL` y los 3 secretos (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `LINK_SECRET`, mínimo 16 caracteres; `npm run provision -- cliente.json --secrets archivo` los genera). Guía: [ENTREGA.md](ENTREGA.md).
2. **B11 — Render y Vercel:** API en plan **Starter** (que no se duerme; hoy tarda ~33 s en frío en el plan gratuito) y el sitio en Render estático **y** en Vercel. Comparar `render.yaml` con *Environment* del servicio vivo (no tuve acceso a Render: pide elegir un espacio de trabajo y no lo hice por mi cuenta).
3. **B12 — Mercado Pago:** `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` de **prueba** primero y recorrer la guía de sandbox de [MERCADOPAGO.md](MERCADOPAGO.md) (incluye la suscripción mensual, que no pude probar sin credenciales). Al final, credenciales de producción.
4. **WhatsApp Business API** (recordatorios y lista de espera): hoy los avisos solo quedan en el log (`server/src/lib/notify/notifier.ts`); falta conectar el proveedor con el número del cliente.
5. **Factura electrónica:** elegir proveedor certificado (Facturante, TusFacturas, Afip SDK…) con el CUIT del cliente e implementar `FacturacionProvider` (la interfaz y el comprobante interno ya están).

## Legales (con abogado)
6. **S12 — Política de privacidad y términos** (Ley 25.326, registro de la base en la AAIP si corresponde): publicar en el sitio y linkear desde el formulario de reserva y desde `security.txt`. El sistema ya tiene exportar/anonimizar y consentimiento de campañas, pero **el texto legal no lo escribí yo ni se puede dar por válido sin revisión**.
7. **V6 — Contrato y licencia:** cesión o licencia de uso, alcance del soporte, qué no incluye, datos del cliente suyos.

## Cosas que dependen de que haya un cliente
8. **V10 — Barbería piloto** (seña o uso real). Sin esto no se ofrece el paquete Completo.
9. **V3 — Entorno de demo** aparte, con cartel «DEMO» y datos de ejemplo; hoy no hay y la landing lo dice.
10. **V5 — Capturas y videos** de los manuales con el sistema real del cliente (guion en [MANUAL-DUENO.md](MANUAL-DUENO.md)).
11. **V1/V2 — Validar precios** con un comprador real. La tabla muestra que **por ahorro no se le gana a AgendaPro con 3 u 8 barberos** ([COSTO-3-ANIOS.md](COSTO-3-ANIOS.md)); hay que decidir el posicionamiento (datos propios, integraciones, cadenas).

## Pequeños pendientes de configuración
12. `client/public/.well-known/security.txt`: contacto y dominio reales (hoy dice `CAMBIAR-DOMINIO`; `npm run smoke` lo marca).
13. Landing `ventas/index.html`: WhatsApp y email reales.
14. En GitHub (Settings): variables `API_URL`, `SITE_URL` (aviso de caídas) y secretos `MONGO_URI`, `BACKUP_PASSPHRASE` (backup semanal); activar Dependabot y la protección de `main`.
15. Probar la restauración del backup contra el Atlas real y anotar fecha y resultado en [BACKUPS.md](BACKUPS.md).
16. Cuenta de uptime externa y Sentry si el cliente quiere aviso por WhatsApp/SMS o trazas ([ENTREGA.md](ENTREGA.md), sección D).
17. Activar la verificación en dos pasos en la cuenta del dueño real (Configuración → Seguridad).
18. Verificar el service worker de la PWA en un celular real y la suscripción en sandbox: pasos exactos y resultados esperados en [PRUEBAS-EN-CELULAR-Y-SANDBOX.md](PRUEBAS-EN-CELULAR-Y-SANDBOX.md). Ahí también está confirmado qué cubre la CSP y que **no hay proyecto de Vercel** de Barbería en tu cuenta.
