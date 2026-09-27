# 05 · Competencia y funciones nuevas para Jack el Barbero

> Investigación hecha en septiembre de 2026 a partir de buscadores, reseñas comparativas y los sitios
> de cada producto. Los sitios de las barberías locales **no se pudieron abrir** desde el entorno
> cloud (bloqueo de red), así que de esas sólo se usa lo que muestran los resultados de búsqueda.

## 1. Quién es la competencia

### A. Plataformas internacionales de reservas (lo que usan las barberías "modernas")

| Plataforma | Qué ofrece | Punto débil para nosotros |
|---|---|---|
| **Booksy** | Reservas, pagos, recordatorios, lista de espera, marketing por SMS/email, gift cards, marketplace con millones de usuarios, "Boost" pago para aparecer primero. ~US$ 30/mes | Tu marca queda dentro de *su* app; el cliente ve a la competencia al lado. |
| **Fresha** | Agenda, recordatorios, CRM, punto de venta, productos, reportes. Sin mensualidad, cobra % por pago | Comisión por cada cobro online; fuerte en UK/UE, poco en Argentina. |
| **SQUIRE** | App con la marca propia de la barbería, lista de espera, fidelidad, POS, reserva desde Instagram | Caro (hasta ~US$ 250/mes), pensado para EE. UU. |
| **theCut** | Hecha sólo para barberos: portfolio, reseñas, políticas por cliente, re-enganche de clientes | Centrada en el barbero individual, no en una marca con varias sedes. |
| **AgendaPro** | Comisiones de empleados, inventario, email marketing, encuestas de satisfacción, gift cards | Complejo y caro para una barbería chica. |

### B. Soluciones argentinas (competencia directa en lo funcional)

| Plataforma | Qué ofrece |
|---|---|
| **ReservaSimple** | Reserva 24/7 por link, recordatorios por WhatsApp y email, seña con Mercado Pago o transferencia |
| **TurnoApp** | Reserva con seña por Mercado Pago |
| **Fontana Software** | Sitio + agenda, seña con Mercado Pago en horarios pico |
| **AgendAR** | Micrositio de reservas, seña con Mercado Pago, recordatorios por la API oficial de WhatsApp |
| **Letbookly** | Asistente en el WhatsApp del negocio que muestra horarios, agenda y cobra la seña |

### C. Barberías premium (competencia de marca, Buenos Aires)

The Bulldog Barber Shop (3 sucursales, turno online), Buenos Aires Barbershop (estética clásica/"ritual"),
BACAN, Barbería Pelizzari (lujo). En general usan **un sitio institucional + una plataforma externa**
(Booksy, Fresha o AgendaPro) para reservar: la experiencia se corta al salir del sitio.

### Conclusión

- **Lo básico que ya tiene todo el mundo** (y nosotros también tenemos que tener): reserva online 24/7,
  seña con Mercado Pago, recordatorios por WhatsApp, gift cards.
- **Dónde está el hueco**: nadie une en **un único sitio con la marca propia** la experiencia premium
  (estética tipo el sitio londinense de referencia) + reserva + tienda + fidelización + un
  **historial personal del cliente**. Las plataformas son genéricas; las barberías premium tercerizan.

## 2. Funciones que vamos a agregar (priorizadas)

Leyenda: ✅ ya lo tienen casi todos (necesario) · ⭐ poco común (diferencial) · 🚀 innovador (casi nadie).

### MVP — se construye con el sitio base

| # | Función | Tipo | Detalle |
|---|---|---|---|
| 1 | **Reserva + seña + envío por WhatsApp con comprobante** | ✅/⭐ | Pedido tuyo. Todos los datos del turno y el comprobante llegan al WhatsApp de la sede ([doc 06](./06-RESERVAS-WHATSAPP-Y-PAGOS.md)). |
| 2 | **Horario reservado 30 min mientras paga** | ⭐ | Nadie más puede tomar ese horario mientras el cliente transfiere; si no paga, se libera solo. |
| 3 | **"Cualquier barbero" inteligente** | ⭐ | Asigna al barbero libre con menos carga del día. |
| 4 | **Agregar al calendario** (Google / Apple, archivo `.ics`) | ✅ | Botón en la confirmación. |
| 5 | **Cancelar / reprogramar sin llamar** | ✅ | Desde "Mi cuenta" o el link del WhatsApp, con política de cancelación (seña retenida si es < 12 h antes). |
| 6 | **Estado "Abierto ahora / cierra a las 20 h"** por sede | ⭐ | En el header de cada sede y en el mapa. |
| 7 | **Vouchers de regalo con QR** | ✅ | Se compran en la tienda, llegan por WhatsApp/email, se canjean escaneando el QR o con el código al reservar. |

### Versión 2 — fidelización (lo que convierte un cliente en habitual)

| # | Función | Tipo | Detalle |
|---|---|---|---|
| 8 | **Lista de espera automática** | ⭐ | Si un día está lleno, te anotás; si alguien cancela, se avisa por WhatsApp al primero de la lista y tiene 15 min para tomarlo. Recupera turnos que hoy se pierden por cancelaciones. |
| 9 | **Ficha del cliente: "Lo mismo que la última vez"** | 🚀 | El barbero guarda fotos y notas de cada corte (número de máquina, largo, productos). El cliente las ve en su cuenta y puede reservar "repetir mi último corte" con un toque. Ninguna plataforma argentina lo ofrece al cliente. |
| 10 | **"Ya te toca el corte"** | ⭐ | El sistema aprende cada cuánto venís (ej. cada 3 semanas) y te manda un WhatsApp con un link directo al horario que solés elegir. |
| 11 | **Club Jack (membresía mensual)** | ⭐ | Suscripción con Mercado Pago (ej. 2 cortes + 1 barba por mes, prioridad en la agenda, 10 % en la tienda). Ingreso fijo para la barbería. |
| 12 | **Puntos y referidos** | ✅/⭐ | Puntos por cada visita/compra canjeables por servicios; "traé un amigo" con descuento para los dos. |
| 13 | **Reseñas verificadas por barbero** | ⭐ | Sólo puede opinar quien tuvo turno; pedido automático 2 h después del servicio; 5 ★ → invitación a dejarla también en Google. |
| 14 | **Portfolio por barbero** | ✅ | Galería de trabajos + especialidades + reseñas en la ficha de cada barbero. |

### Versión 3 — lo que casi nadie tiene

| # | Función | Tipo | Detalle |
|---|---|---|---|
| 15 | **Fila virtual para quienes vienen sin turno** | 🚀 | En la web se ve cuánta gente hay esperando en cada sede y el tiempo estimado; te anotás desde el celular y te llega un WhatsApp 10 min antes de que te toque. Se muestra también en una pantalla dentro del local. |
| 16 | **Probador de cortes con IA** | 🚀 | Subís una selfie y ves cómo te quedaría el corte elegido antes de reservar (con un servicio externo de IA; se evalúa el costo). |
| 17 | **Asistente en WhatsApp** | 🚀 | Responde preguntas frecuentes, muestra horarios y reserva desde el chat (WhatsApp Cloud API). |
| 18 | **Happy hour de horarios** | ⭐ | Descuento automático en horarios de baja demanda (ej. martes 14–16 h) para llenar la agenda. |
| 19 | **Reserva grupal / eventos en el Salón VIP** | ⭐ | Padre e hijo, despedida de soltero, grupos: varios lugares a la vez en la misma sede. |
| 20 | **Propina digital** | ⭐ | Al pagar o después del servicio, propina para el barbero con Mercado Pago. |
| 21 | **App instalable (PWA) con notificaciones** | ⭐ | El sitio se instala en el celular como una app, sin pasar por las tiendas. |
| 22 | **Panel del barbero** | ✅ | Agenda del día, fichas de clientes, comisiones y propinas. |
| 23 | **Métricas para el dueño** | ✅ | Ocupación por sede y barbero, ausencias, ingresos, clientes nuevos vs. recurrentes, servicios más vendidos. |

## 3. Por qué este orden

1. **Primero lo que genera ingresos y evita pérdidas**: la reserva con seña y comprobante (1–7). Según
   los comparativos consultados, pedir seña reduce mucho las ausencias.
2. **Después lo que hace volver al cliente** (8–14): la lista de espera recupera turnos cancelados, y la ficha +
   "ya te toca" + la membresía generan visitas recurrentes.
3. **Al final lo que nos diferencia a la vista** (15–23): fila virtual, IA y asistente, que dependen de
   tener datos y la API de WhatsApp funcionando.

## Fuentes

- [Reservio – mejores software para salones 2026](https://www.reservio.com/blog/tips/choosing-the-best-salon-booking-software)
- [Addagio – mejores apps de reservas para barberos 2026](https://addagio.io/es/blog/best-booking-app-barbers-2026)
- [Fresha para barberías](https://www.fresha.com/for-business/barber)
- [Capterra – Barbershop software 2026](https://www.capterra.com/barbershop-software/)
- [Zenoti – Barbershop trends 2026](https://www.zenoti.com/thecheckin/barbershop-trends-2026)
- [Guideflow – barber booking software](https://www.guideflow.com/blog/barber-booking-software)
- [Goldie – best booking apps for barbers](https://heygoldie.com/blog/best-booking-apps-for-barbers)
- [theCut vs Squire](https://thecut.co/competitors/thecut-vs-squire) · [Booksy vs Squire](https://biz.booksy.com/en-us/comparison/squire-comparison)
- [WaitQ – barbershop queue apps](https://waitq.app/blog/best-barbershop-queue-apps) · [SchedulingKit – AI scheduling](https://schedulingkit.com/ai-scheduling/barbershops)
- [Guía de probadores de peinados con IA 2026](https://therighthairstyles.com/how-to-choose-ai-hairstyle-try-on/)
- [AgendaPro Argentina](https://agendapro.com/ar/barberia/software-para-barberias) · [ReservaSimple](https://www.reservasimple.com/app-turnos-barberia-argentina) · [TurnoApp](https://turnoapp.com.ar/app-turnos-barberia) · [Fontana Software](https://www.fontanasoftware.com.ar/) · [AgendAR](https://kiersys.com/turnos-peluquerias-barberias.html) · [Letbookly](https://letbookly.com/)
- [The Bulldog Barber Shop](https://thebulldogbarbershop.com/) · [Buenos Aires Barbershop](https://buenosairesbarbershop.com/) · [BACAN](https://www.bacanbarberia.com.ar/) · [View Buenos Aires – barberías](https://viewbuenosaires.com/barbershops-in-buenos-aires/)
