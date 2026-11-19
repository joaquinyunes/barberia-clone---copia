import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { expireHolds } from "../src/modules/appointments/appointment.service.js";
import { app, nextWeekday, seedBase, tinyPng } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(4, 3);
let n = 0;
const book = (phone: string, time: string) =>
  request(app)
    .post("/api/v1/public/bookings")
    .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any", date, time, customer: { name: "Cliente", phone } });
const slot = () => `${String(9 + (n++ % 11)).padStart(2, "0")}:00`;

beforeAll(async () => {
  ctx = await seedBase();
});
afterAll(() => {
  delete process.env.RATE_LIMIT_IN_TEST;
});

describe("comprobante falso y reservas sin pagar (alta de la revisión)", () => {
  it("una persona no puede tener más de 3 turnos abiertos sin pagar: el 4.º se rechaza", async () => {
    const phone = "11 4000-0001";
    for (let i = 0; i < 3; i++) expect((await book(phone, `1${i}:00`)).status).toBe(201);
    const fourth = await book(phone, "14:00");
    expect(fourth.status).toBe(409);
    expect(fourth.body.error.message).toMatch(/pendientes/i);
    // otra persona sigue pudiendo reservar
    expect((await book("11 4000-0002", "15:00")).status).toBe(201);
  });

  it("un turno cancelado por vencimiento NO se revive subiendo un comprobante, aunque el horario siga libre", async () => {
    const b = await book("11 4000-0003", "16:00");
    expect(b.status).toBe(201);
    await Appointment.updateOne({ code: b.body.code }, { status: "cancelled", cancellation: { by: "system", at: new Date(), reason: "Venció la reserva" } });
    const r = await request(app).post(`/api/v1/public/bookings/${b.body.code}/receipt`).query({ token: b.body.token }).attach("receipt", tinyPng, "c.png");
    expect(r.status).toBe(409);
    expect(r.body.error.message).toMatch(/venci/i);
    expect((await Appointment.findOne({ code: b.body.code }))!.status).toBe("cancelled");
  });

  it("un comprobante que nadie revisa en 12 horas libera el horario (job), y antes de las 12 h no", async () => {
    const b = await book("11 4000-0004", "17:00");
    const up = await request(app).post(`/api/v1/public/bookings/${b.body.code}/receipt`).query({ token: b.body.token }).attach("receipt", tinyPng, "c.png");
    expect(up.status).toBe(200);
    let a = await Appointment.findOne({ code: b.body.code });
    expect(a!.status).toBe("payment_review");
    const due = a!.reviewExpiresAt!.getTime() - Date.now();
    expect(due).toBeGreaterThan(11.9 * 3_600_000);
    expect(due).toBeLessThanOrEqual(12 * 3_600_000);
    await expireHolds();
    expect((await Appointment.findOne({ code: b.body.code }))!.status).toBe("payment_review");
    await Appointment.updateOne({ code: b.body.code }, { reviewExpiresAt: new Date(Date.now() - 1000) });
    await expireHolds();
    a = await Appointment.findOne({ code: b.body.code });
    expect(a!.status).toBe("cancelled");
    expect(a!.cancellation?.by).toBe("system");
    // el horario quedó libre para otra persona
    expect((await book("11 4000-0005", "17:00")).status).toBe(201);
  });

  it("subir el comprobante varias veces no estira el plazo de revisión", async () => {
    const b = await book("11 4000-0006", "18:00");
    await request(app).post(`/api/v1/public/bookings/${b.body.code}/receipt`).query({ token: b.body.token }).attach("receipt", tinyPng, "c.png");
    const first = (await Appointment.findOne({ code: b.body.code }))!.reviewExpiresAt!.getTime();
    await Appointment.updateOne({ code: b.body.code }, { status: "pending_payment", holdExpiresAt: new Date(Date.now() + 60_000) }); // el admin rechazó el comprobante
    await new Promise((r) => setTimeout(r, 20));
    await request(app).post(`/api/v1/public/bookings/${b.body.code}/receipt`).query({ token: b.body.token }).attach("receipt", tinyPng, "c.png");
    expect((await Appointment.findOne({ code: b.body.code }))!.reviewExpiresAt!.getTime()).toBe(first);
  });

  it("crear reservas tiene un límite por IP más estricto (10 por hora)", async () => {
    process.env.RATE_LIMIT_IN_TEST = "1";
    const codes: number[] = [];
    for (let i = 0; i < 13; i++) codes.push((await book(`11 41${String(i).padStart(2, "0")}-0000`, slot())).status);
    delete process.env.RATE_LIMIT_IN_TEST;
    expect(codes).toContain(429);
  });
});
