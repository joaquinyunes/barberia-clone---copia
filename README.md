# Jack el Barbero

Sitio web + sistema de gestión para una barbería con varias sedes. MERN + TypeScript, en español (Argentina).

- **Sitio público:** home con carrusel, sedes, servicios, salón VIP "La Cava", tienda (gift cards, productos, packs), Club Jack, historia, contacto, cuenta del cliente.
- **Reservas:** asistente por pasos → horario reservado 30 min → seña por transferencia → comprobante → **envío de todos los datos + comprobante al WhatsApp de la sede**. Mercado Pago (Checkout Pro) ya integrado y listo para activar.
- **Panel de administración:** turnos, caja, banco interno de clientes/barberos/proveedores, adelantos, deudas en cuotas, liquidaciones, objetivos, asistencia, inventario, compras, gastos, herramientas, puestos, membresías, packs, gift cards, promociones, reportes, usuarios y permisos, auditoría.

## Requisitos
Node 22+, MongoDB 7 (local con Docker o Atlas).

## Levantar en local
```bash
npm install
docker compose up -d mongo      # o configurá MONGO_URI con Atlas
cp server/.env.example server/.env
npm run seed                    # datos de ejemplo (borra la base)
npm run dev                     # API :4000 + web :5173
```
Usuarios de ejemplo (contraseña `jack1234`): `admin@`, `encargado@`, `recepcion@`, `lucas@` + `jackelbarbero.com`.

## Calidad
```bash
npm run typecheck
npm test                        # 28 tests del backend (unitarios + integración con MongoDB)
npm run lint -w client
npm run test:e2e -w client      # Playwright: sitio, reserva completa y las 29 secciones del panel
npm run build
```

## Estructura
```
client/   React 19 + Vite · CSS Modules · TanStack Query · Zustand · React Hook Form + Zod
server/   Express 5 · Mongoose 8 · Zod · JWT (refresh en cookie httpOnly) · Multer · node-cron · Mercado Pago
docs/     Análisis, arquitectura, roadmap, competencia, WhatsApp/pagos, administración y prompts de imágenes
tools/    Auditoría visual con Playwright del sitio de referencia
```
Documentación completa en [`docs/`](./docs/README.md).
