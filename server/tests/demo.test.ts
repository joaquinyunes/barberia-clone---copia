import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { env } from "../src/config/env.js";
import { setNotifier } from "../src/lib/notify/notifier.js";
import { notify } from "../src/lib/notify/notifier.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
beforeAll(async () => {
  ctx = await seedBase();
  env.DEMO_MODE = true;
});
afterAll(() => {
  env.DEMO_MODE = false;
});

describe("V3: entorno de demo (cartel DEMO y nada real)", () => {
  it("el sitio avisa que es una demo (para mostrar el cartel) y la sede real nunca se confunde", async () => {
    const r = await request(app).get("/api/v1/public/site");
    expect(r.body.demo).toBe(true);
    env.DEMO_MODE = false;
    expect((await request(app).get("/api/v1/public/site")).body.demo).toBe(false);
    env.DEMO_MODE = true;
  });

  it("no se cobra: Mercado Pago queda apagado aunque haya credenciales, y el webhook se ignora", async () => {
    const site = await request(app).get("/api/v1/public/site");
    expect(site.body.mercadoPago).toBe(false);
    const b = await request(app)
      .post("/api/v1/public/bookings")
      .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any", date: nextWeekday(2, 3), time: "11:00", customer: { name: "Demo", phone: "11 4000-9999" } });
    expect(b.status).toBe(201);
    const pref = await request(app).post("/api/v1/public/mercadopago/preference").send({ kind: "appointment", code: b.body.code, token: b.body.token });
    expect(pref.status).toBe(503);
    const hook = await request(app).post("/api/v1/public/mercadopago/webhook").query({ type: "payment", "data.id": "123" }).send({});
    expect(hook.status).toBe(200);
    expect(hook.body).toMatchObject({ ignored: true, demo: true });
  });

  it("no se manda ningún aviso real (WhatsApp, recordatorios): solo queda en el log", async () => {
    const sent: string[] = [];
    setNotifier({ send: async (m) => void sent.push(m.text) });
    await notify({ to: "5491100000000", text: "hola", kind: "reminder" });
    expect(sent).toHaveLength(0);
    env.DEMO_MODE = false;
    await notify({ to: "5491100000000", text: "hola", kind: "reminder" });
    expect(sent).toHaveLength(1);
    env.DEMO_MODE = true;
    setNotifier({ send: async () => undefined });
  });
});
