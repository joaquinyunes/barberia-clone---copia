import { readdirSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { env } from "../src/config/env.js";
import { StoredFile } from "../src/lib/storage.js";
import { app, nextWeekday, seedBase, tinyPng } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(2, 6);
let n = 0;
const book = async () => {
  n += 1;
  const b = await request(app)
    .post("/api/v1/public/bookings")
    .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date, time: `${String(9 + n).padStart(2, "0")}:00`, customer: { name: "Recibo", phone: `11 4800-${1000 + n}` } });
  return b.body as { code: string; token: string };
};
const upload = (b: { code: string; token: string }) => request(app).post(`/api/v1/public/bookings/${b.code}/receipt`).query({ token: b.token }).attach("receipt", tinyPng, "c.png");
const filesOnDisk = () => readdirSync(path.join(path.resolve(env.UPLOAD_DIR), "receipts")).length;

beforeAll(async () => {
  ctx = await seedBase();
});

describe("comprobantes (media 18 de la revisión)", () => {
  it("un comprobante por reserva: mientras se revisa no se puede subir otro (ni queda un archivo huérfano)", async () => {
    const b = await book();
    expect((await upload(b)).status).toBe(200);
    const before = filesOnDisk();
    const again = await upload(b);
    expect(again.status).toBe(409);
    expect(again.body.error.message).toMatch(/revisando/i);
    expect(filesOnDisk()).toBe(before);
  });

  it("si el personal lo rechaza, se puede subir uno nuevo", async () => {
    const b = await book();
    await upload(b);
    const list = await request(app).get("/api/v1/admin/appointments").set(ctx.auth).query({ code: b.code });
    const id = list.body.items[0]._id;
    expect((await request(app).post(`/api/v1/admin/appointments/${id}/reject-deposit`).set(ctx.auth).send({ reason: "Borroso" })).status).toBe(200);
    expect((await upload(b)).status).toBe(200);
  });

  it("con STORAGE_DRIVER=mongo el archivo se guarda en la base (sobrevive a un deploy) y se sirve por el link firmado", async () => {
    env.STORAGE_DRIVER = "mongo";
    try {
      const b = await book();
      const disk = filesOnDisk();
      const stored = await StoredFile.countDocuments();
      expect((await upload(b)).status).toBe(200);
      expect(await StoredFile.countDocuments()).toBe(stored + 1);
      expect(filesOnDisk()).toBe(disk); // nada en el disco efímero
      const wa = await request(app).get(`/api/v1/public/bookings/${b.code}/whatsapp`).query({ token: b.token });
      const link = new URL(wa.body.receiptUrl);
      const img = await request(app).get(link.pathname + link.search);
      expect(img.status).toBe(200);
      expect(img.headers["content-type"]).toBe("image/png");
      expect(Buffer.compare(img.body, tinyPng)).toBe(0);
    } finally {
      env.STORAGE_DRIVER = "disk";
    }
  });
});
