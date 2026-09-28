# 07 · Panel de administración: tu lista depurada + funciones nuevas

Tu propuesta tenía **55 ítems**. Muchos eran el mismo concepto visto desde otro lado (deudas / préstamos / cuotas / gastos asignados; caja / caja por medio / cierre diario; bonos / packs). Los **fusioné en 14 módulos** que comparten una sola base de datos de dinero, eliminé lo redundante y sumé funciones que no encontré en los sistemas del mercado.

> Estado: **todo lo marcado ✅ está programado, probado y funcionando** en este repo (backend + panel).

## La idea central: el "banco interno"

Tal como propusiste, cada peso queda asociado a una persona y a un motivo. Implementación:

```
            BARBERÍA
               │
   ┌───────────┼───────────┐
CLIENTES    BARBEROS   PROVEEDORES      ← una CUENTA por persona (colección Account)
   │           │           │
   └───── MOVIMIENTOS (Movement) ─────┘  ← inmutables; se corrigen con contra-asiento

Regla única de signo:  saldo > 0 → la barbería le debe   ·   saldo < 0 → le deben a la barbería

CAJA (CashMovement) = dinero real que entra/sale, por sede y medio de pago.
```

Separar **"quién debe a quién"** (movimientos) de **"dónde está la plata física"** (caja) es lo que permite responder las 9 preguntas de tu lista con consultas simples, sin doble carga.

## Lo que quedó (14 módulos)

| # | Módulo | Qué fusiona de tu lista | Estado |
|---|---|---|---|
| 1 | **Barberos** | 2, 27 (horarios, breaks, vacaciones, franco, licencia), estados | ✅ |
| 2 | **Cuenta del barbero** | 3, 8, 9, 47 (saldo + historial + liquidaciones) | ✅ |
| 3 | **Adelantos** con **tope configurable** | 4 | ✅ |
| 4 | **Deudas en cuotas** (préstamo, herramienta, producto, faltante de caja) | 10, 11, 30, 31 | ✅ cuotas que se descuentan solas al vencer |
| 5 | **Comisiones** con prioridad de reglas | 5, 6, 39 | ✅ barbero×servicio → servicio → categoría → % barbero → general |
| 6 | **Objetivos** con escalones de bono | 7 + "comisión por cantidad/objetivo" | ✅ |
| 7 | **Asistencia y horas extra** | 28, 29 | ✅ fichaje con PIN, tardanzas, extra → liquidación |
| 8 | **Caja** por sede y medio de pago | 13, 14, 53 | ✅ comisión de cada medio, **cierre ciego** y arqueo por billetes |
| 9 | **Cuenta corriente del cliente** | 15, 16, 37, 38 | ✅ señas, pendientes, saldo a favor, tope de deuda |
| 10 | **Prepagos**: gift cards, packs/bonos, membresías | 17, 18, 19, 43 | ✅ canje parcial, consumo por cupo, renovación |
| 11 | **Promociones y códigos** | 41, 42 | ✅ días, horario, servicios, mínimo, usos, clientes nuevos, automáticas |
| 12 | **Inventario**: venta + uso interno, consumos, compras, proveedores | 20, 21, 22, 44, 45, 46 | ✅ compra → stock + costo + deuda con proveedor |
| 13 | **Activos**: herramientas asignadas, préstamos y mantenimiento; puestos | 23, 24, 25, 26 | ✅ |
| 14 | **Control**: roles/permisos, auditoría, reportes, dashboard | 48–52, 54, 55 | ✅ |

Además: **clientes** (ficha 360°, notas internas separadas de notas de corte, niveles por visitas/antigüedad/membresía/referidos, referidos con crédito automático — ítems 32–36), **registro de cancelaciones** por tipo (36), **precio histórico** (40) y **servicios configurables** (39).

### Qué saqué o simplifiqué (y por qué)

| De tu lista | Decisión |
|---|---|
| "Comisión por cantidad" | Queda cubierta por **objetivos con escalones** (ej. 100 % → bono, 120 % → bono extra): evita un segundo motor de comisiones. |
| "Registro de préstamos del dueño" (30) y "gastos asignados a barbero" (31) | Son **deudas en cuotas** con categoría "préstamo" o "herramienta". Una sola pantalla. |
| "Deudas de proveedores" (46) | Es el **saldo de la cuenta del proveedor**: no hace falta un módulo aparte. |
| "Cierre semanal/mensual" (54) | Es el **reporte de resultados** de cualquier período: se calcula, no se guarda duplicado. |
| "Mantenimiento de puestos" | Se unificó con **herramientas** (lo que se mantiene son las máquinas); el puesto guarda limpieza y estado. |

## Funciones nuevas que NO encontré en el mercado

Revisé AgendaPro, Booksy, Fresha, Squire, theCut, Vagaro, Mangomint, y los argentinos BarberosControl, Blade, Mi Barbería, Posmovi y ReservaSimple. Todos tienen comisiones, caja y liquidación. **Estas no las vi, o no juntas**:

| Función | Por qué importa | Estado |
|---|---|---|
| **Cierre de caja ciego + arqueo por billete** | El cajero cuenta sin ver el "esperado"; la diferencia aparece después. Es un control antifraude de supermercado, no de barbería. | ✅ |
| **Movimientos inmutables con contra-asiento** | Nadie "borra" un adelanto: se anula con un asiento inverso y queda la huella. Auditoría real, no editable. | ✅ |
| **Liquidación con saldo al cierre del período** | Liquidar septiembre no paga comisiones de octubre ya generadas. Los sistemas simples pagan "el saldo actual". | ✅ |
| **El barbero confirma u observa su liquidación** desde su panel, y recibe el recibo por WhatsApp | Menos discusiones de fin de mes. | ✅ |
| **Margen real por servicio y por hora de sillón** | Precio − comisión − insumos, dividido por la duración. Muestra qué servicio conviene empujar. | ✅ |
| **Proyección de caja a 30 días** | Turnos confirmados + renovaciones + cobros pendientes − liquidaciones − proveedores − gastos fijos. "¿Llego a fin de mes?" | ✅ |
| **Tope de deuda por cliente** con autorización | Si el cliente superaría su tope, el cobro se frena hasta que caja lo autorice. | ✅ |
| **Tope automático de adelantos** (% del saldo disponible) | Evita adelantar más de lo que el barbero generó. Se puede forzar y queda auditado. | ✅ |
| **"Modo inflación"**: aumento masivo por %, con redondeo, vista previa e historial | Muy argentino: actualizar 20 precios en 10 segundos sin perder el histórico. | ✅ |
| **Membresía con precio congelado** | El socio mantiene precio aunque suba la carta: argumento de venta fuerte con inflación. | ✅ (flag del plan) |
| **Clientes en riesgo según su propia frecuencia** + WhatsApp con 1 clic | Detecta al que venía cada 20 días y hace 45 que no viene. | ✅ |
| **Seña retenida automáticamente** según anticipación de la cancelación, y seña devuelta como saldo a favor si cancela la barbería | Política justa y automática, sin discutir caso por caso. | ✅ |
| **Link firmado al comprobante** dentro del WhatsApp (vence, no se puede adivinar) | Privacidad del cliente. | ✅ |
| Conciliación automática con el extracto de Mercado Pago | Cruza cobros MP con la caja. | Pendiente (requiere credenciales MP) |

## Preguntas que ahora responde el sistema

| Pregunta | Dónde |
|---|---|
| ¿Quién me debe? / ¿A quién le debo? | Centro de saldos |
| ¿Cuánto ganó cada barbero? ¿Cuánto le adelanté? | Ficha del barbero · Ranking operativo |
| ¿Cuánto tengo pendiente de cobrar / pagar? | Dashboard · Centro de saldos |
| ¿Cuánto hay realmente en caja? | Caja (esperado vs contado) |
| ¿Cuánto dinero tengo "en clientes a favor" y en gift cards sin usar? | Centro de saldos |
| ¿Cuánto gasté en proveedores? | Proveedores · Reportes |
| ¿Gané plata o solo facturé? | Reportes → Resultados (facturación ≠ ganancia) |

## Roles y permisos

| Rol | Ve y hace |
|---|---|
| Administrador | Todo |
| Encargado | Turnos, clientes (con notas internas), caja, stock, barberos/asistencia |
| Recepción | Turnos, clientes, cobros/caja |
| Barbero | Sus turnos, sus clientes del día, su saldo, sus comisiones y sus liquidaciones |

Se pueden sumar permisos puntuales a un usuario (ej. un encargado que además ve reportes). Todo cambio importante queda en **Auditoría** con usuario, fecha y hora.

## Fuentes consultadas

- [BarberosControl](https://www.barberoscontrol.com/) · [Blade](https://blade-web.fractal.net.ar/) · [Mi Barbería](https://mibarberia.app/) · [Posmovi](https://www.posmovi.com/software-pos-barberias/)
- [AgendaPro: software para barberías](https://agendapro.com/ar/barberia/software-para-barberias) · [GetSolo: comisiones](https://getsolo.site/ar/blog/software-gestion-comisiones-peluqueria-argentina-argentina)
- [Homebase: software con liquidación de sueldos](https://www.joinhomebase.com/blog/salon-software-with-payroll) · [Zenoti: mejores software 2026](https://www.zenoti.com/thecheckin/best-salon-management-software-2026) · [Booksy: gestión de empleados](https://biz.booksy.com/blog/do-you-need-salon-employee-management-software)
