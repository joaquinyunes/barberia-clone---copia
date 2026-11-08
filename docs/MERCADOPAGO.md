# WP-13 / S6 — Mercado Pago: qué está verificado y cómo probarlo en sandbox

## Qué hace el sistema
| Flujo | Ruta | Cuándo se confirma |
|---|---|---|
| Seña de un turno (Checkout Pro) | `POST /public/mercadopago/preference` con el link firmado de la reserva | el webhook `payment` aprobado confirma el turno, registra caja y saldo del cliente |
| Pedido de la tienda (gift cards, packs, productos) | igual, `kind: "order"` | el webhook aprueba el pedido y emite gift cards/packs |
| Propina online | `POST /public/bookings/:code/tip` (turno realizado) | el webhook acredita la propina al barbero |
| Membresía con cobro mensual | `POST /me/client/membership/checkout` (cliente con sesión) | webhook `subscription_preapproval` (crea/pausa/cancela) + `payment` de cada cuota (renueva 30 días) |

## Verificado por pruebas automáticas (`server/tests/mercadopago.test.ts`, `engagement.test.ts`; SDK simulado, sin red)
- Webhook **sin firma, con firma inválida o con firma de otro pago → 401** y el turno no se confirma.
- Firma válida + pago aprobado → turno confirmado, seña en caja y saldo, **una sola vez**.
- **Evento repetido y simultáneo** (6 en paralelo): la seña se suma una sola vez (índice único `PaymentEvent.paymentId`). Si la consulta a Mercado Pago falla, el reclamo se libera y el reintento procesa el pago.
- Pago rechazado/pendiente no confirma; **monto menor a la seña** o **turno ya cancelado/vencido** quedan marcados «revisar a mano» en Auditoría (no se pierde plata sin rastro).
- La preferencia no se crea para turnos ya confirmados ni con el token de otra reserva.
- Webhook limitado a 300 pedidos por minuto por IP; avisos de otro tipo se ignoran sin consultar nada.

## NO verificado (necesita credenciales — es del usuario, B12)
- Que Mercado Pago **acepte el formato** de la preferencia y de la suscripción (`preapproval`) y que el `x-signature` real coincida con el cálculo implementado.
- Que los cobros mensuales de una suscripción lleguen como notificación `payment` con el mismo `external_reference` (`membership:<cliente>:<plan>`). Está implementado así según la documentación; hay que confirmarlo con un cobro de prueba.

## Guía de sandbox (30 min)
1. Mercado Pago Developers → crear una aplicación → *Credenciales de prueba*: copiar el **Access Token de prueba** (`TEST-…`) → `MP_ACCESS_TOKEN` en Render.
2. En la aplicación → *Webhooks* → URL `https://<api>/api/v1/public/mercadopago/webhook`, eventos **Pagos** y **Planes y suscripciones**; copiar la **clave secreta** → `MP_WEBHOOK_SECRET`.
3. Crear dos usuarios de prueba (vendedor y comprador) y pagar una seña con la tarjeta de prueba publicada en la documentación de Mercado Pago.
4. Comprobar: turno pasa a *Confirmado*, hay un movimiento «Seña …» en Caja y un único registro en `paymentevents`.
5. Repetir el aviso desde el panel de Webhooks («reenviar»): no debe duplicar nada.
6. Suscripción: pagar la membresía con el usuario comprador; verificar membresía activa y, al simular el cobro mensual, la renovación.
7. Pasar a credenciales de **producción** recién con el cliente y después de este circuito. Rotar cualquier token que se haya pegado en un chat.

## `render.yaml` vs. el servicio vivo
El archivo documenta las variables que exige la API (`NODE_ENV`, `MONGO_URI`, `CLIENT_URL`, `PUBLIC_API_URL`, 3 secretos, `MP_*`, y opcionales `ERROR_WEBHOOK_URL`, `FACTURACION_PROVIDER`). **Falta comparar contra el servicio real** (no tengo acceso a la cuenta de Render desde esta sesión): abrir *Environment* del servicio y confirmar que no sobran ni faltan variables.
