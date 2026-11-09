/**
 * Respaldo y restauración de la base sin depender de mongodump (corre donde corra Node).
 *   npm run backup  -w server -- <carpeta>                 → una colección por archivo .ejson.gz
 *   npm run restore -w server -- <carpeta> <MONGO_URI_DESTINO> [--force]
 *   npm run backup:verify -w server                        → respalda, restaura en una base temporal y compara
 * El respaldo contiene datos personales: guardarlo cifrado y fuera del servidor (ver docs/BACKUPS.md).
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import "dotenv/config";

const { EJSON } = mongoose.mongo.BSON;

const SOURCE = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/jack-el-barbero";

export async function backup(dir: string, uri = SOURCE) {
  mkdirSync(dir, { recursive: true });
  const conn = await mongoose.createConnection(uri).asPromise();
  const manifest: Record<string, { count: number; sha256: string }> = {};
  for (const { name } of await conn.db!.listCollections({}, { nameOnly: true }).toArray()) {
    if (name.startsWith("system.")) continue;
    const docs = await conn.db!.collection(name).find({}).toArray();
    const body = gzipSync(EJSON.stringify(docs, { relaxed: false }));
    writeFileSync(path.join(dir, `${name}.ejson.gz`), body);
    manifest[name] = { count: docs.length, sha256: createHash("sha256").update(body).digest("hex") };
  }
  writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ takenAt: new Date().toISOString(), db: conn.name, collections: manifest }, null, 2));
  await conn.close();
  return manifest;
}

export async function restore(dir: string, uri: string, opts: { force?: boolean } = {}) {
  const conn = await mongoose.createConnection(uri).asPromise();
  const existing = (await conn.db!.listCollections({}, { nameOnly: true }).toArray()).filter((c) => !c.name.startsWith("system."));
  if (existing.length && !opts.force) {
    await conn.close();
    throw new Error(`La base destino "${conn.name}" no está vacía (${existing.length} colecciones). Usá una vacía o --force.`);
  }
  const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8")) as { collections: Record<string, { count: number; sha256: string }> };
  const restored: Record<string, number> = {};
  const files = readdirSync(dir).filter((f) => f.endsWith(".ejson.gz"));
  // Primero se verifican TODOS los archivos: si uno está alterado no se escribe nada (restauración todo o nada).
  for (const file of files) {
    const raw = readFileSync(path.join(dir, file));
    if (createHash("sha256").update(raw).digest("hex") !== manifest.collections[file.replace(".ejson.gz", "")]?.sha256) {
      await conn.close();
      throw new Error(`Archivo alterado o corrupto: ${file}`);
    }
  }
  for (const file of files) {
    const name = file.replace(".ejson.gz", "");
    const raw = readFileSync(path.join(dir, file));
    const docs = EJSON.parse(gunzipSync(raw).toString("utf8")) as Record<string, unknown>[];
    if (docs.length) await conn.db!.collection(name).insertMany(docs as never[]);
    restored[name] = docs.length;
  }
  await conn.close();
  return restored;
}

/** Restaura en una base temporal y confirma que cada colección vuelve con la misma cantidad de documentos. */
export async function verify(uri = SOURCE) {
  const dir = path.join(process.env.TMPDIR ?? process.env.TEMP ?? "/tmp", `jeb-backup-${Date.now()}`);
  const manifest = await backup(dir, uri);
  const tmpUri = uri.replace(/\/[^/?]*(\?|$)/, `/jeb-restore-check-${Date.now()}$1`);
  const restored = await restore(dir, tmpUri);
  const conn = await mongoose.createConnection(tmpUri).asPromise();
  await conn.dropDatabase();
  await conn.close();
  const diffs = Object.entries(manifest).filter(([name, m]) => restored[name] !== m.count);
  return { ok: diffs.length === 0, collections: Object.keys(manifest).length, documents: Object.values(manifest).reduce((a, m) => a + m.count, 0), diffs };
}

const [cmd, a, b, flag] = process.argv.slice(2);
if (process.argv[1]?.endsWith("backup.ts")) {
  try {
    if (cmd === "backup" && a) console.log(await backup(a));
    else if (cmd === "restore" && a && b) console.log(await restore(a, b, { force: flag === "--force" }));
    else if (cmd === "verify") {
      const r = await verify();
      console.log(JSON.stringify(r));
      process.exitCode = r.ok ? 0 : 1;
    } else console.error("Uso: backup <carpeta> | restore <carpeta> <uri> [--force] | verify");
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
  }
  process.exit();
}
