import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(3, 6);
let n = 0;
const book = async () => {
  n += 1;
  const b = await request(app)
    .post("/api/v1/public/bookings")
    .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date, time: `${String(9 + n).padStart(2, "0")}:00`, customer: { name: "Link", phone: `11 4700-${1000 + n}` } });
  return b.body as { code: string; token: string };
};
const get = (b: { code: string; token: string }) => request(app).get(`/api/v1/public/bookings/${b.code}`).query({ token: b.token });
const days = (d: number) => new Date(Date.now() - d * 86_400_000);

beforeAll(async () => {
  ctx = await seedBase();
});

describe("link de gestión de la reserva (media 17 de la revisión)", () => {
  it("devuelve solo lo que el cliente necesita: nada de campos internos", async () => {
    const b = await book();
    await Appointment.updateOne({ code: b.code }, { commission: 7000, commissionRule: "fijo", createdBy: "Recepción Ana", payments: [{ tender: "cash", amount: 1, at: new Date() }], "deposit.approvedBy": "Dueño", "deposit.receiptPath": "receipts/secreto.png" });
    const r = await get(b);
    expect(r.status).toBe(200);
    const txt = JSON.stringify(r.body);
    expect(txt).not.toMatch(/commission|createdBy|Recepción Ana|approvedBy|receiptPath|secreto\.png|payments|whatsappSentAt/);
    expect(r.body).toMatchObject({ code: b.code, status: "pending_payment" });
    expect(r.body.service.name).toBe("Fade");
    expect(r.body.deposit.required).toBe(5000);
    expect(r.body.location.name).toBeTruthy();
  });

  it("un turno cancelado deja de ser gestionable a los 2 días; uno realizado a los 14 (para opinar y dejar propina)", async () => {
    const cancelled = await book();
    await Appointment.updateOne({ code: cancelled.code }, { status: "cancelled", cancellation: { by: "client", at: days(1) } });
    expect((await get(cancelled)).status).toBe(200); // recién cancelado: puede verlo
    await Appointment.updateOne({ code: cancelled.code }, { "cancellation.at": days(3) });
    const old = await get(cancelled);
    expect(old.status).toBe(401);
    expect(old.body.error.message).toMatch(/venci/i);

    const done = await book();
    await Appointment.updateOne({ code: done.code }, { status: "completed", completedAt: days(5) });
    expect((await get(done)).status).toBe(200);
    expect((await request(app).post(`/api/v1/public/bookings/${done.code}/review`).query({ token: done.token }).send({ rating: 5 })).status).toBe(201);
    await Appointment.updateOne({ code: done.code }, { completedAt: days(15) });
    expect((await get(done)).status).toBe(401);
    expect((await request(app).post(`/api/v1/public/bookings/${done.code}/unsubscribe`).query({ token: done.token })).status).toBe(401);
  });
});
