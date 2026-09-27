# 06 · Reservas y compras → WhatsApp con comprobante → Mercado Pago

Requisito: **al reservar un turno (o comprar en la tienda) se envían al WhatsApp de la barbería todos
los datos y el comprobante de pago para agendar el turno.** Después se suma Mercado Pago.

## 1. Lo que WhatsApp permite (y lo que no)

| Opción | Costo | ¿Adjunta el comprobante? | Automático | Requisitos |
|---|---|---|---|---|
| **A. Link `wa.me`** con texto pre-armado | Gratis | ❌ No adjunta archivos → va un **link seguro** al comprobante | El cliente toca "Enviar" | Sólo el número de la sede |
| **B. Web Share API** (celulares) | Gratis | ✅ Comparte la **imagen/PDF** + el texto | El cliente elige WhatsApp y el chat | Navegador compatible (Chrome Android, Safari iOS) |
| **C. WhatsApp Cloud API** (Meta) | ~US$ 0,012 por mensaje "utility" en AR | ✅ Documento/imagen adjunto | 100 % automático | Cuenta Business verificada, plantillas aprobadas por Meta |

**Decisión:** empezamos con **A + B** (funciona ya, gratis) y dejamos **C** preparado para la etapa 3.
En el celular se intenta B y, si el navegador no lo soporta, se usa A. En PC siempre se usa A.

## 2. Flujo del cliente (reserva)

```
Sede → Servicio → Barbero → Fecha → Horario → Datos
   └─► POST /appointments ─► turno "pending_payment", horario reservado 30 min
         └─► Paso "Pago de seña"
               ├─ Etapa 1: ve alias/CBU de la sede y el monto → transfiere → sube el comprobante
               │     └─► POST /payments/appointment/:id/receipt ─► "payment_review"
               └─ Etapa 2: botón Mercado Pago → Checkout Pro → webhook "approved" ─► "confirmed"
         └─► Paso "Enviar por WhatsApp"
               └─► GET /payments/appointment/:id/whatsapp ─► { url, text }
                     ├─ celular: navigator.share({ files: [comprobante], text })
                     └─ PC / fallback: window.open(url)  // https://wa.me/549XXXXXXXXXX?text=...
         └─► Pantalla de confirmación: código de reserva, agregar al calendario, cancelar/reprogramar
```

La compra de vouchers en la tienda sigue **el mismo flujo** (`kind = order`), cambiando el texto del mensaje.

## 3. Mensaje que llega al WhatsApp de la sede

```
✂️ *NUEVA RESERVA – Jack el Barbero*
Código: JEB-7F3K2

👤 Cliente: Juan Pérez
📞 Teléfono: +54 9 11 5555-5555
📧 Email: juan@mail.com

📍 Sede: Palermo – Honduras 1234
💈 Servicio: Corte + Barba (45 min)
🧔 Barbero: Martín
📅 Fecha: sábado 4/10/2026 – 11:30 h

💵 Total: $18.000
✅ Seña: $5.000 – Transferencia
🧾 Comprobante: https://jackelbarbero.com.ar/c/JEB-7F3K2?t=eyJhbGci...
📝 Nota: "Degradé bajo, como la última vez"

Confirmar / rechazar: https://jackelbarbero.com.ar/admin/turnos/JEB-7F3K2
```

Para pedidos de la tienda: `🛍️ *NUEVO PEDIDO*`, con el detalle de productos y cantidades, el total, los datos
de quien recibe el voucher y el comprobante.

El texto lo arma **el backend** (`lib/whatsapp/buildMessage.ts`, función pura con tests), así:
- el cliente no puede alterar precios ni datos en la URL: se generan a partir de lo guardado en MongoDB;
- el mismo texto se reutiliza para el email de copia y, en la etapa 3, para la Cloud API.

## 4. El comprobante

- Formatos: **JPG, PNG, WEBP, PDF**; máximo **5 MB**. Se valida el tipo *real* del archivo (magic bytes), no sólo la extensión.
- Se guarda en **Cloudinary** (en desarrollo, en disco local `server/uploads/`, fuera del repo).
- El link del mensaje es **firmado y vence** (JWT con `code` + expiración de 7 días): nadie puede adivinar
  los comprobantes de otros cambiando el código.
- Límite de subidas por IP (rate limit) para evitar abuso.

## 5. Estados

```
pending_payment ──(sube comprobante)──► payment_review ──(admin aprueba)──► confirmed ──► completed
      │                                       │                                 │
      │ (30 min sin pagar: node-cron)         │ (admin rechaza)                 ├─► cancelled (cliente/admin)
      ▼                                       ▼                                 └─► no_show
  cancelled (horario liberado)          pending_payment (se avisa al cliente)

Etapa 2 (Mercado Pago): pending_payment ──(webhook approved)──► confirmed  (sin revisión manual)
```

- Cada sede tiene su propio `whatsapp`, `bankAlias` y `depositAmount` (monto de la seña), editables desde el admin.
- Si el cliente sube el comprobante pero **no** envía el WhatsApp, el turno igual aparece en el panel del
  admin en "Pendientes de revisión": el WhatsApp es un aviso, no la única fuente de verdad.

## 6. Mercado Pago (etapa 2)

1. `POST /payments/mercadopago/preference` crea una **preferencia** (Checkout Pro) con el ítem "Seña – Corte + Barba",
   `external_reference = JEB-7F3K2`, `back_urls` (éxito / pendiente / error) y `notification_url`.
2. El cliente paga en Mercado Pago y vuelve a `/reservar/resultado`.
3. `POST /payments/mercadopago/webhook`: se **valida la firma `x-signature`**, se consulta el pago por ID a la API
   de Mercado Pago (nunca se confía en los datos del query) y, si está `approved`, el turno pasa a `confirmed`.
4. Se ofrece igual el botón de WhatsApp; en lugar del link al comprobante, el mensaje lleva el **número de operación
   de Mercado Pago** y un link al comprobante que generamos nosotros.
5. La membresía "Club Jack" usa **suscripciones** (`preapproval`) de Mercado Pago.

Variables: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` (server) · `VITE_MP_PUBLIC_KEY` (client).

## 7. WhatsApp Cloud API (etapa 3)

- Al confirmar: plantilla *utility* al cliente ("Tu turno quedó confirmado…") y a la sede, con el comprobante como documento adjunto.
- Recordatorio 24 h antes, aviso de lista de espera y "ya te toca el corte".
- Mismo `buildMessage.ts`; sólo cambia el "canal" (`lib/whatsapp/cloudApi.ts`).
- Variables: `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, `WA_VERIFY_TOKEN`.

## 8. Componentes y archivos involucrados

| Capa | Archivo | Responsabilidad |
|---|---|---|
| server | `modules/payments/payment.model.ts` | Esquema `Payment` |
| server | `modules/payments/receipt.service.ts` | Validar, guardar y firmar el comprobante |
| server | `modules/payments/mercadopago.service.ts` | Preferencia + procesamiento del webhook |
| server | `modules/payments/payment.controller.ts` / `payment.routes.ts` | Endpoints |
| server | `lib/whatsapp/buildMessage.ts` | Texto del mensaje (reserva / pedido) |
| server | `lib/whatsapp/waLink.ts` | `https://wa.me/<num>?text=<encodeURIComponent(texto)>` |
| server | `modules/jobs/releaseExpiredHolds.ts` | Libera turnos sin pago a los 30 min |
| client | `features/payments/components/BankTransferInfo/` | Alias/CBU con botón "copiar" y monto |
| client | `features/payments/components/ReceiptUploader/` | Arrastrar/elegir archivo, vista previa, progreso |
| client | `features/payments/components/WhatsAppSendButton/` | Botón verde "Enviar reserva por WhatsApp" |
| client | `features/payments/utils/shareToWhatsApp.ts` | Web Share API con archivo o fallback `wa.me` |
| client | `features/payments/hooks/useUploadReceipt.ts` · `useWhatsAppLink.ts` | Lógica separada de la UI |
| client | `features/booking/components/StepPayment/` · `StepWhatsApp/` | Pasos del asistente de reserva |

## 9. Tests

- `buildMessage.test.ts`: el texto contiene todos los campos, formatea ARS y fecha en español y no se pasa del largo máximo.
- `receipt.service.test.ts`: rechaza un `.exe` renombrado a `.jpg`, archivos > 5 MB y tokens vencidos.
- `mercadopago.service.test.ts`: firma inválida → 401; pago `rejected` no confirma el turno.
- E2E Playwright: reservar → subir comprobante → la URL de WhatsApp generada contiene el código y la sede.
