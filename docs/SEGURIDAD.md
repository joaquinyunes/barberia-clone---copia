# S13 — Informe de seguridad (08/11/2026)

Revisión hecha con el método de las skills `security-and-hardening` y `/security-review`: lectura de los cambios por un **revisor independiente** (agente aparte, solo lectura, 14 hallazgos verificados contra el código) y corrección de lo encontrado. Cifras de verificación al final.

## Estado del paquete S
| # | Control | Estado | Evidencia |
|---|---|---|---|
| S1 | `npm audit --omit=dev` sin altas ni críticas | ✅ 0 vulnerabilidades (antes 4 altas + 2 moderadas) | CI falla si aparece una alta (`npm audit --omit=dev --audit-level=high`) |
| S2 | CSP en modo bloqueo | ✅ `vercel.json` y `render.yaml`; scripts solo `'self'`; revisado en navegador: home, reservar e ingresar sin violaciones | `style-src 'unsafe-inline'` queda por los `style=""` de React/Framer Motion (no admiten nonce); no hay endpoint de reportes |
| S3 | Límites de tasa y bloqueo | ✅ login/registro 20 por 15 min por IP; reservas, lista de espera, comprobantes, links de reserva, webhook (300/min); cuenta bloqueada 15 min tras 5 fallos (contador atómico) | `hardening.test.ts` |
| S4 | Cuentas de personal | ✅ contraseña ≥ 12, 2FA TOTP (secreto cifrado AES-256-GCM, activar pide contraseña, no se puede pisar uno activo), cierre en todos los dispositivos, cookie `HttpOnly; Secure; SameSite=None` en producción | `hardening.test.ts` |
| S5 | Validación en el borde | ✅ zod en las rutas con cuerpo (se agregó `PATCH /settings`), rechazo de `$` y `.` en claves de body/query, 1 MB de body, comprobantes 5 MB con tipo por firma de bytes | tests |
| S6 | Webhooks | ✅ firma, idempotencia atómica, reclamo trabado se retoma a los 5 min, monto y estado validados | `mercadopago.test.ts` (12) |
| S7 | Roles y auditoría | ✅ permisos granulares existentes; auditoría de solo lectura (hooks de update/delete/bulkWrite) | límite abajo |
| S8 | Secretos | ✅ ninguno en HEAD; historial de 27 commits escaneado con los patrones del CI (sin `gitleaks`, que no está instalado): único hallazgo, una clave pública de Google Maps de un iframe del sitio de referencia en el primer commit (no es del negocio, ya no está en `main`); `server/.env.example` sin valores | nada que rotar |
| S9 | CORS y cabeceras | ✅ CORS cerrado a `CLIENT_URL`; HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy` en API y sitio; `security.txt` | ⚠ completar contacto real (👤) |
| S10 | Backups + restauración | ✅ herramienta + prueba local (28 colecciones, 6.813 documentos) | ⚠ probar con Atlas real (👤), ver `BACKUPS.md` |
| S11 | Dependabot y CI | ✅ semanal y agrupado; CI con Mongo, lint y auditoría | |
| S12 | Datos personales | 🟡 técnica hecha: exportar y anonimizar, consentimiento solo opt-in, logs sin datos personales ni tokens (la query `?token=` se recorta) | 👤 texto de privacidad y términos con abogado |
| S13 | Esta revisión | ✅ | |

## Hallazgos de la revisión independiente y qué se hizo
| # | Sev. | Hallazgo | Resolución |
|---|---|---|---|
| 1 | Alta | `backup.yml` sube un dump a un **repo público**: cualquiera con cuenta de GitHub puede bajarlo y probar la clave por fuerza bruta | **Corregido:** el trabajo no corre si el repo no es privado; 600.000 iteraciones; passphrase de 32+ caracteres. ⚠ **El repo actual es público** (ver «Decisión tuya») |
| 2 | Alta | `/2fa/setup` pisaba un 2FA activo con solo el access token | **Corregido:** pide contraseña, secreto pendiente aparte, 409 si ya hay 2FA, límite de tasa; test que lo reproduce |
| 3 | Media | El bloqueo de cuenta se esquivaba con pedidos en paralelo | **Corregido:** `$inc` atómico y entrada atómica que re-chequea el bloqueo; test con 6 intentos paralelos |
| 4 | Media | Aprobar seña dos veces a la vez (webhook + admin) duplicaba caja; confirmar sobre un turno que se pisa | **Corregido:** reclamo atómico del estado y chequeo de solapamiento; test. **Límite:** `cash.record` + `ledger.post` + `save` no son una transacción; si el proceso muere en el medio puede quedar un movimiento sin turno confirmado (en Atlas se pueden usar transacciones; requiere réplica, la base de tests local no la tiene) |
| 5 | Media | Suscripción: avisos simultáneos creaban dos membresías; cobro antes de la autorización se perdía | **Corregido:** índice único parcial por `mpPreapprovalId`, descarte de la membresía sobrante, 409 con reintento; test |
| 6 | Media | Evento `processing` trabado tras un reinicio | **Corregido:** se retoma pasados 5 min; test |
| 7 | Media | Se podía dar consentimiento de campañas por el teléfono de otra persona | **Corregido:** el formulario público solo fija consentimiento al crear la ficha; test |
| 8 | Media | `qr.svg` público servía de oráculo de códigos de gift card (5 caracteres) | **Corregido:** QR solo para personal (`/admin/commercial/giftcards/:id/qr.svg`); códigos nuevos de 10 caracteres (50 bits). Las tarjetas viejas de 5 siguen valiendo |
| 9 | Media | Enumeración de cuentas por mensaje y por tiempo; bloqueo usable para dejar afuera al dueño | **Parcial:** mensaje único y comparación contra hash de relleno (corregido). **Riesgo aceptado:** quien conozca el email del dueño puede bloquearlo 15 min enviando 5 intentos; mitiga el 2FA y el límite por IP; si molesta, pasar a bloqueo por cuenta+IP |
| 10 | Baja | Una ficha puede quedar tomada por un tercero si reserva con el celular de otra persona y su propio email, y luego se registra | **No corregido:** requiere verificar el email por correo (sin proveedor de mail todavía). Impacto limitado a fichas nuevas sin cuenta; anotado como pendiente |
| 11 | Baja | Cualquier cliente con sesión podía leer la configuración; puntos sin tope razonable | **Corregido:** 403 a clientes; topes `pointsPerThousand ≤ 100`, `pointValue ≤ 10` |
| 12 | Baja | Anonimizar dejaba datos en pedidos y reseñas, desbloqueaba al cliente vetado y ponía su nombre en la auditoría | **Corregido** (no toca `blocked`, limpia pedidos y reseñas, sin nombre en la bitácora); test |
| 13 | Baja | La auditoría «solo lectura» no cubría `doc.deleteOne()` ni `collection.*` | **Parcial:** se agregó `bulkWrite`. **Para blindarla de verdad:** usuario de Mongo de la API sin permiso de borrar/actualizar `auditlogs` (👤 en Atlas) |
| 14 | Baja | La CSP permite cualquier `*.onrender.com` | **Documentado:** al entregar a un cliente reemplazar por el host exacto de su API (`ENTREGA.md`, paso 6) |

Descartado tras verificar: CSRF en `/auth/refresh` (sin efecto lateral, CORS impide leer la respuesta), bypass del sanitizador NoSQL, IDOR con tokens de reserva, firma del webhook.

## Decisión tuya
- **El repositorio de GitHub es público.** Todo lo que se empuja (incluidos `docs/COSTO-3-ANIOS.md`, `PAQUETES-Y-PRECIOS.md`, `PENDIENTES-USUARIO.md` y la estrategia de venta) lo puede leer cualquiera. Recomiendo hacerlo **privado** antes de ofrecer el producto o de activar el backup en GitHub. Hacerlo privado también cambia cómo funcionan Dependabot y las Actions en el plan gratuito (siguen disponibles).

## No revisado
Módulos de caja, libro mayor, liquidaciones, asistencia y el `crudRouter` genérico por entidad, más allá de lo que tocan los cambios; el flujo `complete()` salvo puntos; la configuración real de Render, Vercel y Atlas; XSS en el cliente fuera del diff (no hay `dangerouslySetInnerHTML`); pruebas de penetración dinámicas.

## Verificación (08/11/2026)
Servidor 100/100 pruebas (17 archivos), cliente 14/14, `tsc` 0 errores, lint 0 avisos, builds OK, `npm audit --omit=dev` 0.
