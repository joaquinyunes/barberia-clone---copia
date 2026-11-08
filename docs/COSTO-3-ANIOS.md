# V2 — Costo a 3 años contra AgendaPro

**Frase de venta (a validar con un comprador real):** «Turnos online para barberías: lista de espera, recordatorios, comisiones por barbero, membresías y gift cards, sin pagar una cuota por barbero.»

## Fuentes y fecha (no son de memoria)
| Dato | Valor | Fuente | Fecha de la consulta |
|---|---|---|---|
| Plan Individual | $7.900/mes, 1 agenda (primeros 3 meses $990) | <https://agendapro.com/ar/planes> (ARS, IVA incluido) | 08/11/2026 |
| Plan Full | $15.900/mes, de 2 a 5 agendas al mismo precio (primeros 3 meses $990), incluye comisiones e inventario | <https://agendapro.com/ar/planes> | 08/11/2026 |
| Plan PRO IA | $69.900/mes con 2 profesionales + $20.000 por cada profesional adicional (hasta 30) | <https://agendapro.com/ar/planes> | 08/11/2026 |
| Paquete WhatsApp | desde $7.900/mes con 50 mensajes (los mensajes de Meta los paga el comercio) | <https://agendapro.com/ar/planes> | 08/11/2026 |
| Facturación electrónica | «próximamente», sin precio | <https://agendapro.com/ar/planes> | 08/11/2026 |
| Dólar oficial Banco Nación | $1.560 (lunes 02/11/2026) | El Economista, <https://eleconomista.com.ar/economia/dolar-hoy-cuanto-cotiza-lunes-2-noviembre-n99379> | 08/11/2026 |

> Aviso: la página de AgendaPro para barberías dice «los planes van desde $13.900 ARS/mes» (`/ar/barberia/software-para-barberias`), distinto de los $7.900/$15.900 de `/ar/planes`. Usé `/ar/planes` por ser la página de precios. AgendaPro avisa que puede cambiar tarifas con 30 días de aviso y que los precios de arriba rigen para cuentas nuevas (clientes actuales migran desde 01/01/2027). **Volver a consultar el día que se muestre la tabla a un comprador.**

## Tabla a 36 meses (precios en pesos con IVA, dólar a $1.560 — es un supuesto, mover la cotización cambia los USD)

| Escenario | Cuota mensual | 36 meses en ARS | 36 meses en USD |
|---|---|---|---|
| **AgendaPro, 3 barberos** — Full, con la promo de 3 meses a $990 | $15.900 | $527.670 | **≈ USD 338** |
| AgendaPro, 3 barberos — Full sin promo | $15.900 | $572.400 | ≈ USD 367 |
| AgendaPro, 3 barberos — Full + paquete WhatsApp (recordatorios) | $23.800 | $856.800 (812.070 con promo) | ≈ USD 521–549 |
| **AgendaPro, 8 barberos** — PRO IA ($69.900 + 6 × $20.000) | $189.900 | $6.836.400 | **≈ USD 4.382** |
| **Este sistema, paquete Completo** — USD 10.000 con 12 meses de mantenimiento + 24 meses × USD 120 | — | — | **USD 12.880** |
| Este sistema, Instalación USD 3.500 + Mensual USD 90 × 36 | — | — | USD 6.740 |
| Este sistema, Instalación USD 2.500 + Mensual USD 60 × 36 | — | — | USD 4.660 |

## Qué dice la tabla (sin maquillar)
1. **Por precio no se le gana a AgendaPro con 3 ni con 8 barberos.** Para 3 barberos la suscripción cuesta unos USD 340–550 en tres años; USD 10.000 son 20–30 veces más. Para 8, unos USD 4.400: el paquete Completo es casi 3 veces más caro.
2. **El punto de equilibrio** del paquete Completo (USD 12.880 a 3 años) contra PRO IA llega recién cerca de **26–27 barberos** (a $1.560 por dólar y con los precios de hoy); con el esquema Instalación USD 3.500 + USD 90/mes, cerca de **13 barberos**.
3. Por lo tanto **USD 10.000 de una sola vez no se defiende con ahorro**. Solo se defiende por lo que una suscripción no da: los datos y el código son del cliente, integración propia con Mercado Pago/WhatsApp/factura de su proveedor, funciones a medida (comisiones, membresías, gift cards) y cero cuota que crece con cada barbero. Eso hay que **validarlo con un comprador real antes de fijar el precio** (jurado 12 del tribunal).
4. Recomendación de venta: ofrecer primero **Instalación + Mensual** a una barbería de 3 a 8 barberos (cuesta menos que lo que dejaría de ahorrar en 3 años solo si se valora lo anterior) y reservar el **Completo** para cadenas o varias sedes (10 o más barberos).

## Cómo rehacer la tabla
Cambiar las cifras de las fuentes y recalcular: `36 × cuota` (menos la promo de los primeros 3 meses: `3 × 990 + 33 × 15.900`), y para N > 5 barberos `69.900 + 20.000 × (N − 2)` por mes. Equilibrio: `N = 2 + (costo_mensual_nuestro_en_ARS − 69.900) / 20.000`.
