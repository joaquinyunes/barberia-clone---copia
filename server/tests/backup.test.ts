import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { backup, restore, verify } from "../src/tools/backup.js";
import { Client } from "../src/modules/clients/client.model.js";
import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { seedBase } from "./fixtures.js";

const base = process.env.MONGO_TEST_URI ?? "mongodb://127.0.0.1:27017/jeb-test";
const uriFor = (db: string) => base.replace(/\/[^/?]*(\?|$)/, `/${db}$1`);

describe("S10: backup y restauración", () => {
  it("respalda, restaura en una base vacía y los datos vuelven idénticos (tipos incluidos)", async () => {
    await seedBase();
    await Client.create({ name: "Ñandú Pérez", phone: "5491155559999", email: "n@mail.com", points: 120, birthday: new Date("1990-05-17T00:00:00Z") });
    const dir = mkdtempSync(path.join(tmpdir(), "jeb-bk-"));
    const manifest = await backup(dir, base);
    expect(manifest.clients.count).toBeGreaterThanOrEqual(1);
    expect(Object.keys(manifest).length).toBeGreaterThan(5);

    const target = uriFor(`jeb-restore-${Date.now()}`);
    const restored = await restore(dir, target);
    for (const [name, m] of Object.entries(manifest)) expect(restored[name], name).toBe(m.count);

    const conn = await mongoose.createConnection(target).asPromise();
    const original = await Client.collection.findOne({ phone: "5491155559999" });
    const copy = await conn.db!.collection("clients").findOne({ phone: "5491155559999" });
    expect(copy).toEqual(original); // ObjectId, Date y números conservan su tipo
    expect(copy!._id).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(copy!.birthday).toBeInstanceOf(Date);
    const apptsBefore = await Appointment.countDocuments();
    expect(await conn.db!.collection("appointments").countDocuments()).toBe(apptsBefore);

    // una base que ya tiene datos NO se pisa
    await expect(restore(dir, target)).rejects.toThrow(/no está vacía/);
    await conn.dropDatabase();
    await conn.close();
  });

  it("un archivo alterado o corrupto se detecta antes de escribir nada", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "jeb-bk-"));
    await backup(dir, base);
    const file = path.join(dir, "clients.ejson.gz");
    const bytes = readFileSync(file);
    bytes[bytes.length - 12] ^= 0xff;
    writeFileSync(file, bytes);
    const target = uriFor(`jeb-restore-bad-${Date.now()}`);
    await expect(restore(dir, target)).rejects.toThrow(/alterado o corrupto/);
    const conn = await mongoose.createConnection(target).asPromise();
    expect((await conn.db!.listCollections().toArray()).length).toBe(0);
    await conn.dropDatabase();
    await conn.close();
  });

  it("backup:verify hace el ciclo completo y no deja la base temporal", async () => {
    const r = await verify(base);
    expect(r).toMatchObject({ ok: true, diffs: [] });
    expect(r.documents).toBeGreaterThan(0);
  });
});
