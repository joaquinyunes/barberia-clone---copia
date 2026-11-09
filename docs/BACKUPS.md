# S10 — Backups y prueba de restauración

## Qué hay
- **Herramienta propia** (sin mongodump): `server/src/tools/backup.ts`.
  - `npm run backup -w server -- <carpeta>` → un archivo `.ejson.gz` por colección + `manifest.json` con cantidades y hash SHA-256.
  - `npm run restore -w server -- <carpeta> <MONGO_URI_DESTINO>` → verifica los hashes y restaura. **Se niega a escribir en una base que no esté vacía** (para no pisar datos); `--force` solo para casos manuales.
  - `npm run backup:verify -w server` → respalda, restaura en una base temporal, compara cantidad por colección y borra la temporal. Sale con error si algo no coincide.
- **Automático:** `.github/workflows/backup.yml` corre los lunes 06:17 UTC (y a pedido). Requiere los secretos `MONGO_URI` y `BACKUP_PASSPHRASE`; cifra con AES-256 (600.000 iteraciones; la clave debe tener 32+ caracteres al azar) y guarda 30 días como artefacto. **Solo corre en repositorios privados**: en uno público cualquiera puede bajar los artefactos. Sin esos secretos tampoco hace nada.
- **Atlas:** en el plan gratuito (M0) **no hay backups propios**; los snapshots continuos empiezan en M10 (de pago). Para clientes con plan Mensual se recomienda M10 **además** de este respaldo.

## Prueba automatizada (`server/tests/backup.test.ts`, corre en cada `npm test`)
- Respalda, restaura en una base vacía y compara cantidad por colección **y el contenido y los tipos** (ObjectId, fechas, números) de un cliente con acentos.
- Una base con datos **no se pisa**.
- Un archivo alterado o corrupto se detecta **antes de escribir nada** (la restauración es todo o nada; la prueba encontró que antes escribía las colecciones previas al archivo dañado y se corrigió).
- `backup:verify` hace el ciclo completo y deja la base temporal borrada.

## Prueba de restauración (resultado real)
| Fecha | Base | Resultado |
|---|---|---|
| 09/11/2026 | Mongo 8.2 local, pruebas automáticas (3/3) | contenido y tipos idénticos; base con datos rechazada; archivo alterado rechazado sin escribir |
| 08/11/2026 | Mongo 8.2 local con los datos del seed | `backup:verify` → `{"ok":true,"collections":28,"documents":6813,"diffs":[]}`; restaurada además en otra base: mismas cantidades; un segundo intento sobre la base ya restaurada fue **rechazado** (como corresponde) |

**Falta (del usuario):** repetir la prueba contra el Atlas real del cliente piloto y anotar fecha y resultado acá. Hasta que no se haga con datos reales, el backup en producción figura como *no probado*.

## Cómo restaurar en una emergencia
1. Descargar el artefacto del workflow *Backup* y descifrarlo: `openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass env:BACKUP_PASSPHRASE -in backup.tgz.enc | tar -xz`.
2. Crear una base **nueva y vacía** en Atlas.
3. `npm run restore -w server -- bk "mongodb+srv://…/jack-el-barbero-restaurada"`.
4. Apuntar `MONGO_URI` de Render a esa base, reiniciar, correr `npm run smoke` y revisar la agenda de hoy.
5. Los índices se recrean solos cuando la API arranca (Mongoose los sincroniza).

## Cuidado
El respaldo tiene datos personales (nombres, teléfonos, emails): guardarlo cifrado, no mandarlo por chat ni mail, y borrar las copias viejas. Un cliente que pidió anonimizarse (`POST /admin/clients/:id/anonymize`) sigue apareciendo en backups viejos hasta que vencen (30 días): decirlo en la política de privacidad.
