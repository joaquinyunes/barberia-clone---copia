# V1 — Tres paquetes con precio (propuesta a validar con un comprador real)

> Los precios de abajo son una **propuesta de trabajo**, no un dato de mercado. Se confirman o se corrigen en la primera conversación con una barbería real. La comparación contra suscripciones está en [COSTO-3-ANIOS.md](COSTO-3-ANIOS.md) y muestra que **el precio no se defiende por ahorro** con 3 a 8 barberos.

## 1. Instalación — USD 2.500 a 3.500 (una vez)
- Base de datos (MongoDB Atlas), API (Render), sitio (Vercel/Render) y dominio puestos a nombre del cliente. Guía repetible: [ENTREGA.md](ENTREGA.md) (menos de 1 hora, probado de cero).
- Datos reales cargados: sede, horarios, servicios, barberos, cuenta del dueño con verificación en dos pasos.
- Capacitación de 2 horas al dueño y al equipo con [MANUAL-DUENO.md](MANUAL-DUENO.md) y [MANUAL-BARBERO.md](MANUAL-BARBERO.md).
- Qué NO incluye: migración de datos de otra herramienta, integraciones con credenciales del cliente, rediseño de marca.

## 2. Mensual — USD 90 a 120 por mes (por sede)
- Hosting de API y base (Render plan que no se duerme + Atlas), backups semanales cifrados y prueba de restauración trimestral ([BACKUPS.md](BACKUPS.md)).
- Actualizaciones de seguridad (revisión semanal de dependencias; cuando salga una vulnerabilidad alta, parche en **2 días hábiles**).
- Aviso de caídas y errores ([ENTREGA.md](ENTREGA.md), sección Monitoreo).
- Soporte por escrito (WhatsApp o mail) en horario comercial: respuesta en **4 horas hábiles**; caída del servicio: **1 hora hábil**.
- Qué NO incluye: funciones nuevas (se cotizan aparte), costos de terceros (Mercado Pago, WhatsApp Business, proveedor de factura), capacitación adicional.

## 3. Completo — ~USD 10.000 (una vez)
Todo lo anterior más:
- Integraciones locales con las cuentas del cliente: **Mercado Pago** (seña, propina y cobro mensual de membresía), **WhatsApp** (recordatorios y lista de espera por la API oficial) y **factura electrónica** con un proveedor certificado (Facturante, TusFacturas, Afip SDK, etc.) conectado a la interfaz `FacturacionProvider`.
- Migración de clientes y agenda desde la herramienta anterior (CSV).
- **12 meses de mantenimiento incluidos**; desde el mes 13 pasa al Mensual.
- Código fuente, repositorio y todas las cuentas a nombre del cliente al cierre.

### Condiciones antes de ofrecerlo (veredicto del tribunal)
1. Al menos **un cliente real usando el sistema** en producción (V10).
2. **Contrato y licencia** revisados con abogado (V6) — pendiente del usuario.
3. Integraciones probadas en sandbox con credenciales de prueba del cliente.

## Resumen
| Paquete | Se paga | Precio de partida |
|---|---|---|
| Instalación | una vez | USD 2.500 – 3.500 |
| Mensual | por mes y por sede | USD 90 – 120 |
| Completo | una vez (incluye 12 meses de Mensual) | ≈ USD 10.000 |

El Completo vale la pena frente a una suscripción solo para **cadenas o varias sedes (≈ 13 o más barberos con Instalación + Mensual; ≈ 26 o más contra el Completo)**.
