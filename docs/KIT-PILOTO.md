# V10 — Kit del piloto (barbería real)

El piloto real lo consigue y lo hace el usuario; este kit deja listo todo lo demás. **Sin un piloto no se ofrece el paquete Completo** (veredicto del tribunal).

## 1. Cómo elegir la barbería piloto
- 3 a 8 barberos, 1 sede, que hoy use WhatsApp/planilla o una herramienta que le pese, y un dueño que atienda el mostrador (para que use el sistema todos los días).
- Condición comercial sugerida: Instalación bonificada o con descuento a cambio de **uso real durante 60 días, feedback semanal y permiso escrito para contar el caso** (nombre, números, una frase).
- No elegir a un amigo que «lo va a probar un día»: tiene que cobrar turnos de verdad.

## 2. Checklist de arranque (semana 0)
- [ ] Cuentas a nombre del cliente (Atlas, Render, dominio) — [ENTREGA.md](ENTREGA.md)
- [ ] `cliente.json` completo y `npm run provision` + `npm run smoke` en verde
- [ ] Servicios, precios, barberos, horarios y seña cargados con el dueño
- [ ] Clientes y agenda futura importados por CSV (Fidelización → Importar)
- [ ] Dueño con 2FA activo y contraseña propia
- [ ] Mercado Pago de **prueba** circuito completo ([MERCADOPAGO.md](MERCADOPAGO.md)), después producción
- [ ] Capacitación de 2 horas con los manuales y el video 1
- [ ] Backup restaurado una vez con el dueño delante ([BACKUPS.md](BACKUPS.md))
- [ ] Contacto de soporte por escrito y tiempos de respuesta acordados
- [ ] Permiso para usar el caso (firmado)

## 3. Métricas a medir (semana 1, 4 y 8)
| Métrica | Cómo se mide | Meta del piloto |
|---|---|---|
| Turnos reservados online / total | Reportes del panel | ≥ 40 % a la semana 4 |
| Turnos sin seña confirmada que vencen | Cancelaciones (motivo «seña no abonada») | < 15 % |
| No-shows | Reportes | bajar ≥ 30 % contra el mes anterior |
| Horas que el dueño dedica a agenda y caja | Pregunta semanal | bajar ≥ 50 % |
| Clientes recuperados («no vuelven» 45 días) | Fidelización | ≥ 5 en el mes |
| Opiniones y NPS | Fidelización → Opiniones | NPS positivo |
| Caídas o errores 500 | Uptime y aviso de errores | 0 caídas > 30 min |
| Disposición a pagar | Pregunta final: «¿cuánto pagarías por mes y por instalación?» | registrar el número |

## 3 bis. Preguntas para la reunión de cierre (día 60)
¿Lo usarías sin nosotros? ¿Qué te falta? ¿Qué pagarías por esto? ¿Lo recomendarías a otra barbería? ¿Qué te molestó?

## 4. Contrato — BORRADOR (no es asesoramiento legal: lo revisa un abogado antes de firmar)
**Contrato de licencia de uso y mantenimiento — piloto**
1. **Partes:** [NOMBRE DEL PROVEEDOR], CUIT [__] («el Proveedor») y [BARBERÍA], CUIT [__] («el Cliente»).
2. **Objeto:** el Proveedor instala y configura el sistema de turnos, caja y comisiones y le otorga al Cliente una licencia de uso [no exclusiva / exclusiva] durante la vigencia.
3. **Vigencia del piloto:** 60 días desde [FECHA]. Luego se renueva por acuerdo escrito (paquete Mensual o Completo).
4. **Precio:** Instalación $[__] / USD [__] (bonificada en el piloto: [__]). Mensual desde el día 61: USD [__] por sede.
5. **Alcance del soporte:** respuesta en 4 horas hábiles; caída del servicio en 1 hora hábil; parches de seguridad altos en 2 días hábiles. **No incluye:** funciones nuevas (se cotizan), costos de terceros (Mercado Pago, WhatsApp, factura, hosting si lo contrata el Cliente), capacitación adicional.
6. **Datos:** los datos de los clientes finales son del Cliente, que es el responsable de la base de datos (Ley 25.326). El Proveedor los trata solo para prestar el servicio, no los cede y los devuelve o borra al terminar. Backups cifrados; el Cliente puede pedir exportación en cualquier momento.
7. **Propiedad:** el código es del Proveedor [o se cede al Cliente en el paquete Completo]; la marca, el contenido y los datos son del Cliente.
8. **Confidencialidad y seguridad:** ambas partes guardan reserva; el Proveedor informa dentro de 72 h cualquier incidente de seguridad que afecte datos personales.
9. **Uso del caso:** el Cliente autoriza al Proveedor a mencionar el caso (nombre, métricas, una frase) solo con aprobación escrita previa del texto.
10. **Limitación de responsabilidad:** tope en lo pagado en los últimos 12 meses; sin responsabilidad por lucro cesante ni por caídas de terceros.
11. **Terminación:** cualquiera puede terminar con 30 días de aviso; el Cliente recibe sus datos exportados.
12. **Ley y jurisdicción:** [tribunales ordinarios de __].

## 5. Qué falta (del usuario)
Conseguir la barbería, firmar con un abogado, cargar cuentas y credenciales, y medir. Ver [PENDIENTES-DEL-USUARIO.md](PENDIENTES-DEL-USUARIO.md).
