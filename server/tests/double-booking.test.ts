import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(2, 2);

const book = (time: string, n: number, barber = String(ctx.lucas._id), service = String(ctx.fade._id)) =>
  request(app)
    .post("/api/v1/public/bookings")
    .send({ location: String(ctx.location._id), service, barber, date, time, customer: { name: `Cliente ${n}`, phone: `11 8000-${String(1000 + n)}` } });

const outcomes = (rs: { status: number }[]) => ({ ok: rs.filter((r) => r.status === 201).length, taken: rs.filter((r) => r.status === 409).length });

beforeAll(async () => {
  ctx = await seedBase();
});

describe("doble reserva imposible", () => {
  it("10 clientes piden el mismo turno a la vez: gana uno solo", async () => {
    const rs = await Promise.all(Array.from({ length: 10 }, (_, i) => book("10:00", i)));
    expect(outcomes(rs)).toEqual({ ok: 1, taken: 9 });
    expect(await Appointment.countDocuments({ barber: ctx.lucas._id, startsAt: rs.find((r) => r.status === 201)!.body.startsAt })).toBe(1);
  });

  it("'cualquier barbero' con un solo barbero libre: también gana uno solo", async () => {
    const rs = await Promise.all(Array.from({ length: 6 }, (_, i) => book("12:00", 20 + i, "any")));
    expect(outcomes(rs)).toEqual({ ok: 1, taken: 5 });
  });

  it("turnos que se pisan con distinto inicio (14:00–14:45 vs 14:30–15:00 vs 14:15–15:00): gana uno solo", async () => {
    const rs = await Promise.all([book("14:00", 40), book("14:30", 41, String(ctx.lucas._id), String(ctx.beard._id)), book("14:15", 42, String(ctx.lucas._id), String(ctx.beard._id))]);
    expect(outcomes(rs)).toEqual({ ok: 1, taken: 2 });
    const active = await Appointment.find({ barber: ctx.lucas._id, startsAt: { $gte: new Date(`${date}T16:30:00Z`), $lt: new Date(`${date}T18:30:00Z`) } });
    expect(active).toHaveLength(1);
  });

  it("dos reprogramaciones al mismo horario: gana una sola", async () => {
    const a = await book("16:00", 60);
    const b = await book("17:00", 61);
    expect([a.status, b.status]).toEqual([201, 201]);
    const move = (r: typeof a) => request(app).post(`/api/v1/public/bookings/${r.body.code}/reschedule`).query({ token: r.body.token }).send({ date, time: "19:00" });
    const rs = await Promise.all([move(a), move(b)]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it("aunque se salte la capa de servicio, el índice único de la base frena el mismo horario", async () => {
    const first = await Appointment.findOne({ barber: ctx.lucas._id });
    const clone = first!.toObject();
    const attempts = await Promise.allSettled(
      Array.from({ length: 4 }, (_, i) => Appointment.create({ ...clone, _id: undefined, code: `DUP-${i}`, createdAt: undefined, updatedAt: undefined })),
    );
    expect(attempts.every((r) => r.status === "rejected")).toBe(true);
  });
});
