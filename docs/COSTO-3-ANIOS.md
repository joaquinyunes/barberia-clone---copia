# V2 — Costo a 3 años contra AgendaPro

**Frase de venta (a validar con un comprador real):** «Turnos online para barberías: lista de espera, recordatorios, comisiones por barbero, membresías y gift cards, sin pagar una cuota por barbero.»

## Fuentes y fecha (leídas del sitio público, no de memoria)
Página de precios: <https://agendapro.com/ar/planes>, **leída el 20/11/2026** (ARS, IVA incluido; la página no muestra fecha de actualización). **Los precios cambiaron respecto de mi lectura del 08/11**: entonces figuraban Individual $7.900, Full $15.900 y Pro IA $69.900; hoy figuran los de abajo. Conviene volver a leerla el día que se muestre la tabla.

| Plan | Mensual | Profesionales | Adicionales |
|---|---|---|---|
| Individual | $9.900 (primeros 3 meses $990) | 1 | no admite |
| Básico | $19.900 | 2 incluidos | +$5.000 c/u del 3.º al 5.º; +$10.000 c/u desde el 6.º |
| Premium | $39.900 | 2 incluidos | igual que Básico |
| Pro IA | $129.900 | hasta 5 | +$20.000 c/u desde el 6.º, hasta 30 |

Otros datos de la misma página: paquete WhatsApp desde $7.900/mes con 50 mensajes (los mensajes de Meta los paga el comercio); Recepcionista IA $10.000 por profesional/mes en Básico y Premium (incluida en Pro IA); API para integraciones US$200/mes; facturación electrónica «próximamente»; precio congelado 12 meses; los precios rigen para cuentas nuevas (clientes actuales migran desde el 01/01/2027); el toggle anual «ahorrá 15%» no muestra montos. Qué incluye cada plan (comisiones, inventario) no figura en el texto leído: **verificar antes de comparar funciones**.
Dólar oficial Banco Nación: **$1.560** (lunes 02/11/2026, El Economista: <https://eleconomista.com.ar/economia/dolar-hoy-cuanto-cotiza-lunes-2-noviembre-n99379>); es un supuesto: mover la cotización cambia los USD.

## Tabla a 36 meses (ARS con IVA)
| Escenario | Cuota mensual | 36 meses en ARS | 36 meses en USD |
|---|---|---|---|
| **AgendaPro, 3 barberos** — Básico (19.900 + 5.000) | $24.900 | $896.400 | **≈ USD 575** |
| AgendaPro, 3 barberos — Premium (39.900 + 5.000) | $44.900 | $1.616.400 | ≈ USD 1.036 |
| AgendaPro, 3 barberos — Pro IA | $129.900 | $4.676.400 | ≈ USD 2.998 |
| **AgendaPro, 8 barberos** — Básico (19.900 + 3×5.000 + 3×10.000) | $64.900 | $2.336.400 | **≈ USD 1.498** |
| AgendaPro, 8 barberos — Premium | $84.900 | $3.056.400 | ≈ USD 1.959 |
| AgendaPro, 8 barberos — Pro IA (129.900 + 3×20.000) | $189.900 | $6.836.400 | ≈ USD 4.382 |
| + paquete WhatsApp (recordatorios), a cualquiera | +$7.900 | +$284.400 | ≈ +USD 182 |
| **Este sistema, Completo** — USD 10.000 con 12 meses incluidos + 24 × USD 120 | — | — | **USD 12.880** |
| Este sistema, Instalación USD 3.500 + Mensual USD 90 × 36 | — | — | USD 6.740 |
| Este sistema, Instalación USD 2.500 + Mensual USD 60 × 36 | — | — | USD 4.660 |

## Qué dice la tabla (sin maquillar)
1. **Por precio no se le gana a AgendaPro con 3 ni con 8 barberos.** Con 3 barberos la suscripción cuesta entre ≈ USD 575 y 1.036 en tres años (Básico/Premium) y USD 10.000 son 10 a 17 veces más. Con 8, entre ≈ USD 1.500 y 2.000 (Básico/Premium) contra USD 6.740–12.880.
2. **Punto de equilibrio:** el paquete Completo (USD 12.880 a 3 años) recién iguala a Premium con **≈ 56 barberos** (Básico ≈ 58); Instalación USD 3.500 + Mensual USD 90, con **≈ 29–31**; Instalación USD 2.500 + Mensual USD 60, con **≈ 20–22**. Contra Pro IA el equilibrio es mucho menor, pero Pro IA incluye una recepcionista de IA que este sistema no tiene.
3. Por lo tanto **USD 10.000 de una sola vez no se defiende con ahorro**, ni siquiera para una cadena mediana. Solo se defiende por lo que una suscripción no da (datos y código propios, integraciones con las cuentas del cliente, funciones a medida, cero cuota por barbero) y eso hay que **validarlo con un comprador real** antes de fijar el precio (jurado 12 del tribunal). **Recomendación:** salir con Instalación + Mensual (USD 2.500–3.500 + USD 60–90 por mes) y reservar el Completo para quien pague por la propiedad y la integración, no por ahorro.

## Cómo rehacer la tabla
Costo mensual para N profesionales: `Básico/Premium = precio + 5.000 × min(max(N−2,0), 3) + 10.000 × max(N−5,0)`; `Pro IA = 129.900 + 20.000 × max(N−5,0)`. Multiplicar por 36 y dividir por la cotización. Equilibrio: el menor N con `cuota_AgendaPro(N) ≥ costo_total_nuestro / 36`.
