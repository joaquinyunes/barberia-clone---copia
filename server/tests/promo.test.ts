import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Promotion } from "../src/modules/commercial/commercial.models.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(5, 4);
beforeAll(async () => {
  ctx = await seedBase();
  await Promotion.create({ name: "Una vez", code: "UNAVEZ", type: "percent", value: 20, maxUses: 1, active: true });
});
afterAll(() => {
  delete process.env.RATE_LIMIT_IN_TEST;
});

const book = (phone: string, time: string, promoCode?: string) =>
  request(app)
    .post("/api/v1/public/bookings")
    .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any", date, time, customer: { name: "Promo", phone }, promoCode });

describe("promociones (media 15 de la revisión)", () => {
  it("un código con 1 solo uso no se puede usar en dos reservas simultáneas", async () => {
    const rs = await Promise.all([book("11 4600-0001", "10:00", "UNAVEZ"), book("11 4600-0002", "12:00", "UNAVEZ")]);
    expect(rs.map((r) => r.status).sort()).toEqual([201, 400]); // el segundo ya ve la promo agotada (y si dos instancias compiten, el reclamo condicional da 409)
    expect((await Promotion.findOne({ code: "UNAVEZ" }))!.uses).toBe(1);
    expect(rs.find((r) => r.status === 201)!.body.discount).toBe(3000);
  });

  it("si la reserva falla después de reclamar el uso, el uso se devuelve", async () => {
    await Promotion.updateOne({ code: "UNAVEZ" }, { uses: 0 });
    const taken = await book("11 4600-0003", "14:00");
    expect(taken.status).toBe(201);
    const clash = await book("11 4600-0004", "14:00", "UNAVEZ"); // mismo horario del único barbero: falla
    expect(clash.status).toBe(409);
    expect((await Promotion.findOne({ code: "UNAVEZ" }))!.uses).toBe(0);
  });

  it("validar un código responde igual para uno inexistente, vencido o agotado (no se puede explorar)", async () => {
    await Promotion.updateOne({ code: "UNAVEZ" }, { uses: 1 }); // agotado
    const ask = (code: string) => request(app).post("/api/v1/public/promotions/validate").send({ code, service: String(ctx.fade._id), date, time: "11:00" });
    const gone = await ask("NOEXISTE");
    const spent = await ask("UNAVEZ");
    expect(gone.status).toBe(200);
    expect(spent.status).toBe(200);
    expect(gone.body).toEqual(spent.body);
    expect(gone.body.valid).toBe(false);
  });

  it("validar códigos tiene límite de tasa (frena la prueba de códigos al azar)", async () => {
    process.env.RATE_LIMIT_IN_TEST = "1";
    const codes: number[] = [];
    for (let i = 0; i < 25; i++) codes.push((await request(app).post("/api/v1/public/promotions/validate").send({ code: `ADIVINA${i}`, service: String(ctx.fade._id), date, time: "11:00" })).status);
    delete process.env.RATE_LIMIT_IN_TEST;
    expect(codes).toContain(429);
  });
});
