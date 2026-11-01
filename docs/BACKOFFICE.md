# Back-office: matriz contra la competencia

Qué usa la competencia de barberías y belleza «por atrás» y qué hay hoy en este repo. Se armó leyendo
[`05-COMPETENCIA-Y-FUNCIONES.md`](./05-COMPETENCIA-Y-FUNCIONES.md) y [`07-ADMIN-Y-FINANZAS.md`](./07-ADMIN-Y-FINANZAS.md)
y contrastando **cada fila con el código** (`server/src/modules`, `client/src`), no con lo que los docs dicen que hay.

Competencia: **AgendaPro** (agenda, comisiones, inventario, ventas, recordatorios), Pedí Tu Turno, Booksy, Fresha,
SQUIRE, theCut y las argentinas ReservaSimple, TurnoApp, AgendAR y Letbookly.

Leyenda: ✅ lo tiene · 🟡 parcial · ❌ falta. **NUEVO** = se agregó en esta rama (`feat/backoffice-turnos`).
La columna «N.º» es el número de función del doc 05 cuando corresponde (V2 = «versión 2», V3 = «versión 3»).

## 1. Agenda y reservas

| Función | Quién la tiene | N.º | Estado | Dónde está / qué falta |
|---|---|---|---|---|
| Reserva online 24/7 por link | todos | 1 | ✅ | `public/bookings`, `BookingWizard` |
| Elegir barbero o «cualquiera» (el de menos carga) | Booksy, Fresha | 3 | ✅ | `pickBarber` en `appointment.service.ts` |
| Seña por transferencia con comprobante y envío al WhatsApp de la sede | ReservaSimple | 1 | ✅ | `attachReceipt`, `whatsappFor`, link firmado al comprobante |
| Seña con Mercado Pago | TurnoApp, AgendAR | 1 | 🟡 | El código existe; su verificación es del paquete WP-13 (no se tocó acá) |
| Horario retenido mientras paga (vence solo) | — | 2 | ✅ | `holdExpiresAt` + job `expire-holds` |
| Agregar al calendario (.ics) | Booksy | 4 | ✅ | `GET /public/bookings/:code/calendar.ics` |
| Cancelar / reprogramar sin llamar, con política de seña | Booksy, Fresha | 5 | ✅ | `cancel`, `reschedule`; seña retenida según `cancellationHours` |
| «Abierto ahora / cierra a las…» por sede | — | 6 | ✅ | `client/src/features/catalog/hours.ts` |
| Agenda del admin: alta manual, walk-in, estados, cobro | AgendaPro | — | ✅ | `AppointmentsPage`; vista de lista por día (no hay grilla de calendario por barbero) |
| Horarios, descansos y ausencias del barbero | todos | — | ✅ | `barber.model.ts` (`schedule`, `breaks`, `absences`) |
| **Recordatorio automático antes del turno** | AgendaPro, ReservaSimple, AgendAR | — | ✅ **NUEVO** | `reminder.service.ts` + job cada 10 min; configurable en `reminderHours`. Sale por la interfaz de avisos (ver §6) |
| **Lista de espera automática** (avisar al primero, 15 min para tomarlo) | Booksy, SQUIRE | V2 · 8 | ✅ **NUEVO** | `modules/waitlist`, hook en `cancel()`; anotarse desde el paso «¿Cuándo?»; tabla en Admin → Lista de espera |
| Reserva grupal / eventos en el Salón VIP | — | V3 · 19 | ❌ | Sin código |
| Fila virtual para quienes llegan sin turno | WaitQ | V3 · 15 | ❌ | Solo existe `source: "walkin"` (alta manual) |
| Happy hour de horarios | — | V3 · 18 | ✅ | Promociones automáticas con días y horario (`Promotion.automatic`, `timeFrom/timeTo`) |

## 2. Clientes y fidelización

| Función | Quién la tiene | N.º | Estado | Dónde está / qué falta |
|---|---|---|---|---|
| Ficha 360° (turnos, saldo, compras, membresía, notas) | Fresha, AgendaPro | — | ✅ | `GET /admin/clients/:id/profile`, `ClientDetailPage` |
| Notas de corte visibles para el próximo barbero | theCut | V2 · 9 | ✅ | `cutNotes`, se cargan al finalizar el turno |
| **«Lo mismo que la última vez»**: el cliente ve su último corte y reserva con un toque | nadie en Argentina | V2 · 9 | ✅ **NUEVO** | `GET /me/client/last-cut`, `POST /me/client/repeat-last-cut`, tarjeta en «Mi cuenta». Falta: **fotos** del corte (el modelo tiene `photos`, no hay subida) |
| «Ya te toca el corte» (aviso por frecuencia propia) | — | V2 · 10 | 🟡 | `atRiskClients` detecta al que se atrasó y arma el WhatsApp con 1 clic; **no se envía solo** |
| Membresía mensual (Club) | Booksy, SQUIRE | V2 · 11 | 🟡 | Planes, consumo por cupo y renovación manual ✅; **cobro recurrente automático con Mercado Pago** ❌ |
| Packs / bonos | AgendaPro | — | ✅ | `issuePack`, `coverageFor` |
| Gift cards | Booksy, AgendaPro | 7 | 🟡 | Venta, saldo y canje parcial ✅; **QR** y envío automático ❌ |
| Referidos con crédito | — | V2 · 12 | ✅ | `referralCode`, `afterVisit` |
| Puntos por visita canjeables | SQUIRE | V2 · 12 | 🟡 | Hay niveles por visitas/antigüedad con descuento; **no hay puntos canjeables** |
| Reseñas verificadas por barbero (y pedido a las 2 h) | Booksy, theCut | V2 · 13 | ❌ | Sin modelo ni pantalla |
| Encuesta de satisfacción | AgendaPro | — | ❌ | Sin código |
| Portfolio por barbero | theCut | V2 · 14 | 🟡 | Foto, bio, especialidades, Instagram ✅; **galería de trabajos** ❌ |
| Campañas masivas por WhatsApp / email / SMS | Booksy, AgendaPro | — | ❌ | `MessagesPage` solo muestra los mensajes del formulario de contacto |
| Bloquear clientes y tope de deuda | — | — | ✅ | `blocked`, `creditLimit` |

## 3. Equipo y comisiones

| Función | Quién la tiene | N.º | Estado | Dónde está / qué falta |
|---|---|---|---|---|
| Comisiones con prioridad de reglas (barbero×servicio → servicio → categoría → % barbero → general) | AgendaPro | — | ✅ | `commission.service.ts`, calculada al finalizar el turno |
| **Reporte de comisiones por barbero y servicio, con % real** | AgendaPro | — | ✅ **NUEVO** | `GET /admin/reports/commissions`, pestaña «Comisiones» en Reportes (antes: solo el total por barbero en el ranking) |
| Cuenta del barbero, adelantos con tope, deudas en cuotas | — | — | ✅ | `staff.service.ts`, `ledger` |
| Liquidación con saldo al cierre y conformidad del barbero | — | — | ✅ | `closeSettlement`, `me/barber/settlements/:id/respond` |
| Objetivos con bonos escalonados | — | — | ✅ | `Goal`, `goalProgress` |
| Asistencia (fichaje con PIN) y horas extra | — | — | ✅ | `attendanceKioskRouter`, `attendanceSummary` |
| Panel del barbero (agenda, fichas, saldo, comisiones, propinas) | theCut | 22 | ✅ | `MyBarberPage`, `me/barber` |
| Propina | SQUIRE | 20 | 🟡 | Se registra al cobrar en el local y se acredita al barbero; **propina digital online** ❌ |

## 4. Dinero, ventas e inventario

| Función | Quién la tiene | Estado | Dónde está / qué falta |
|---|---|---|---|
| Caja por sede y medio de pago, cierre ciego y arqueo | — | ✅ | `cash.service.ts` |
| Venta de productos dentro del turno y tienda online con pedidos | Fresha, AgendaPro | ✅ | `complete()`, `orders` |
| Inventario: stock, compras, proveedores, consumos, herramientas | AgendaPro | ✅ | `inventory` |
| Cuenta corriente del cliente, señas, saldo a favor | — | ✅ | `ledger` |
| Promociones y códigos | Booksy | ✅ | `commercial` |
| Estado de resultados, margen por servicio y por hora, proyección de caja | — | ✅ | `reports.service.ts` |
| Auditoría y permisos por rol | — | ✅ | `audit`, `core/permissions.ts` |
| Conciliación automática con Mercado Pago | — | 🟡 | Pendiente de credenciales; es de WP-13 |
| Factura electrónica (ARCA/AFIP) | AgendaPro Argentina | ❌ | Fuera de alcance: el sistema no emite comprobantes fiscales |

## 5. Canales y extras

| Función | Quién la tiene | N.º | Estado | Dónde está / qué falta |
|---|---|---|---|---|
| Asistente de reservas en WhatsApp | Letbookly | V3 · 17 | ❌ | Sin código |
| Probador de cortes con IA | — | V3 · 16 | ❌ | Sin código |
| App instalable (PWA) con notificaciones | — | V3 · 21 | ❌ | No hay manifest ni service worker |
| Métricas del dueño (ocupación, ausencias, ingresos, nuevos vs. recurrentes) | todos | V3 · 23 | 🟡 | Ocupación, ausencias, ingresos y servicios más vendidos ✅; **nuevos vs. recurrentes**: solo se cuentan los nuevos |

## 6. Cómo salen los avisos (importante)

La lista de espera y los recordatorios usan la interfaz `Notifier` (`server/src/lib/notify/notifier.ts`).
El canal por defecto **no envía nada**: deja una línea en el log con el tipo de aviso y los últimos 4 dígitos del
número (sin el texto). Para mandar WhatsApp de verdad hay que implementar `send()` con la API oficial y registrarla con
`setNotifier()` al arrancar; sus credenciales entrarían como variables nuevas en la tabla de [`DEPLOY.md`](./DEPLOY.md).
Hasta entonces **ninguna persona recibe estos avisos**, aunque la lógica (a quién, cuándo, con qué texto y qué
horario se guarda) está completa y probada.

## 7. Prioridad de lo que sigue

1. **Conectar el canal real de WhatsApp** al `Notifier`: sin esto, lista de espera y recordatorios no llegan a nadie. Es el desbloqueo de más valor.
2. **«Ya te toca el corte» automático**: ya se detecta quién se atrasó; falta un job que lo mande por el mismo canal.
3. **Reseñas verificadas y encuesta**: ayudan a vender (Booksy, theCut) y detectan problemas; dependen del canal del punto 1.
4. **Fotos del corte** en la ficha del cliente (el modelo ya tiene `photos`).
5. **Cobro recurrente de la membresía** con Mercado Pago, cuando WP-13 deje la integración verificada.

## 8. Límites conocidos de lo nuevo

- **Lista de espera**: solo se activa al **cancelar** (cliente o barbería) o al **vencer una seña**. Reprogramar un turno también libera un horario, pero hoy no dispara el aviso. Las entradas viejas de días pasados quedan en «esperando» (no molestan: solo se consultan por el día del horario liberado).
- **Lista de espera**: el horario liberado se reserva para quien espera con la misma lógica de seña que una reserva normal; si la sede no pide seña, el turno queda confirmado de inmediato y el aviso lo dice.
- **Recordatorios**: no se mandan a turnos que empiezan en menos de 1 hora ni a turnos sin seña confirmada.
- **Repetir último corte**: busca horarios solo con el mismo barbero (próximos 14 días, hasta 3 sugerencias).
