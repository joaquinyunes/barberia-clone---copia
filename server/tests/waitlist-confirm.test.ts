import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setNotifier, type OutgoingMessage } from "../src/lib/notify/notifier.js";
import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { Barber } from "../src/modules/barbers/barber.model.js";
import { Location } from "../src/modules/locations/location.model.js";
import { WaitlistEntry } from "../src/modules/waitlist/waitlist.model.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(3, 4);
const sent: OutgoingMessage[] = [];
const ids = () => ({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any" });
const join = (phone: string, name: string) => request(app).post("/api/v1/public/waitlist").send({ ...ids(), date, customer: { name, phone } });

beforeAll(async () => {
  ctx = await seedBase();
  setNotifier({ send: async (m) => void sent.push(m) });
  await Barber.updateOne({ _id: ctx.lucas._id }, { $set: { "schedule.3": { day: 3, start: "10:00", end: "10:45" } } });
  await Location.updateOne({ _id: ctx.location._id }, { depositAmount: 0 }); // sede sin seña: antes el turno ofrecido quedaba CONFIRMADO solo
});
afterAll(() => setNotifier({ send: async () => undefined }));

describe("lista de espera: se ofrece y se espera la confirmación (media 19 de la revisión)", () => {
  it("en una sede sin seña, el horario ofrecido NO queda confirmado solo: el cliente lo confirma desde su link", async () => {
    const first = (await request(app).post("/api/v1/public/bookings").send({ ...ids(), barber: String(ctx.lucas._id), date, time: "10:00", customer: { name: "Ana", phone: "11 4900-0000" } })).body;
    expect((await join("11 4900-0001", "Beto")).status).toBe(201);
    await request(app).post(`/api/v1/public/bookings/${first.code}/cancel`).query({ token: first.token }).send({});
    const offered = await WaitlistEntry.findOne({ status: "offered" });
    const appt = await Appointment.findById(offered!.appointment);
    expect(appt!.status).toBe("pending_payment"); // retenido unos minutos, no confirmado
    expect(appt!.holdExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    expect(sent.at(-1)!.text).toMatch(/confirm/i);

    const token = /token=([^&\s)]+)/.exec(sent.at(-1)!.text)![1];
    const ok = await request(app).post(`/api/v1/public/bookings/${appt!.code}/confirm`).query({ token: decodeURIComponent(token) }).send({});
    expect(ok.status).toBe(200);
    expect((await Appointment.findById(appt!._id))!.status).toBe("confirmed");
    // confirmar dos veces o un turno que sí exige seña no se puede
    expect((await request(app).post(`/api/v1/public/bookings/${appt!.code}/confirm`).query({ token: decodeURIComponent(token) }).send({})).status).toBe(409);
  });

  it("si no lo confirma a tiempo, el horario se libera y pasa al siguiente (no queda tomado)", async () => {
    const { expireHolds } = await import("../src/modules/appointments/appointment.service.js");
    const first = (await request(app).post("/api/v1/public/bookings").send({ ...ids(), barber: String(ctx.lucas._id), date: nextWeekday(3, 11), time: "10:00", customer: { name: "Zoe", phone: "11 4900-0010" } })).body;
    await request(app).post("/api/v1/public/waitlist").send({ ...ids(), date: nextWeekday(3, 11), customer: { name: "Yuri", phone: "11 4900-0011" } });
    await request(app).post(`/api/v1/public/bookings/${first.code}/cancel`).query({ token: first.token }).send({});
    const offered = await WaitlistEntry.findOne({ status: "offered", date: nextWeekday(3, 11) });
    await Appointment.updateOne({ _id: offered!.appointment }, { holdExpiresAt: new Date(Date.now() - 1000) });
    await expireHolds();
    expect((await Appointment.findById(offered!.appointment))!.status).toBe("cancelled");
  });

  it("una misma persona no puede anotarse en más de 3 esperas a la vez (no se usa para llenar a otro de avisos)", async () => {
    const dates = [nextWeekday(3, 18), nextWeekday(3, 25), nextWeekday(3, 32), nextWeekday(3, 39)];
    const codes: number[] = [];
    for (const d of dates) {
      await request(app).post("/api/v1/public/bookings").send({ ...ids(), barber: String(ctx.lucas._id), date: d, time: "10:00", customer: { name: "Ocupa", phone: "11 4900-0020" } });
      codes.push((await request(app).post("/api/v1/public/waitlist").send({ ...ids(), date: d, customer: { name: "Spam", phone: "11 4900-0099" } })).status);
    }
    expect(codes).toEqual([201, 201, 201, 409]);
  });
});
