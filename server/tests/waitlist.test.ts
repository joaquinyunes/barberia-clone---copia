import request from "supertest";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { setNotifier, type OutgoingMessage } from "../src/lib/notify/notifier.js";
import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { expireHolds } from "../src/modules/appointments/appointment.service.js";
import { Barber } from "../src/modules/barbers/barber.model.js";
import { WaitlistEntry } from "../src/modules/waitlist/waitlist.model.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(3, 2); // un miércoles
const freeDate = nextWeekday(5, 2); // un viernes con la agenda normal
const sent: OutgoingMessage[] = [];

const ids = () => ({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any" });
const book = (phone: string, name: string) =>
  request(app).post("/api/v1/public/bookings").send({ ...ids(), barber: String(ctx.lucas._id), date, time: "10:00", customer: { name, phone } });
const join = (phone: string, name: string, d = date) =>
  request(app).post("/api/v1/public/waitlist").send({ ...ids(), date: d, customer: { name, phone } });

beforeAll(async () => {
  ctx = await seedBase();
  setNotifier({ send: async (m) => void sent.push(m) });
  // los miércoles Lucas atiende un solo turno (10:00–10:45): el día se llena con una reserva
  await Barber.updateOne({ _id: ctx.lucas._id }, { $set: { "schedule.3": { day: 3, start: "10:00", end: "10:45" } } });
});

afterEach(() => {
  sent.length = 0;
});

describe("lista de espera automática", () => {
  let first: { code: string; token: string };

  it("no deja anotarse si el día todavía tiene horarios libres", async () => {
    const r = await join("11 6000-0001", "Curioso", freeDate);
    expect(r.status).toBe(409);
  });

  it("con el día lleno, los clientes se anotan en orden y repetir no duplica", async () => {
    first = (await book("11 6000-0000", "Ana")).body;
    expect(first.code).toBeTruthy();
    const b = await join("11 6000-0002", "Beto");
    const c = await join("11 6000-0003", "Cata");
    const again = await join("11 6000-0002", "Beto");
    expect([b.status, c.status, again.status]).toEqual([201, 201, 201]);
    expect([b.body.position, c.body.position, again.body.position]).toEqual([1, 2, 1]);
    expect(await WaitlistEntry.countDocuments({ status: "waiting" })).toBe(2);
  });

  it("al cancelar, el primero de la lista recibe el aviso y el horario queda reservado 15 min", async () => {
    const r = await request(app).post(`/api/v1/public/bookings/${first.code}/cancel`).query({ token: first.token }).send({});
    expect(r.status).toBe(200);

    const offered = await WaitlistEntry.findOne({ status: "offered" }).populate("client");
    expect((offered!.client as unknown as { name: string }).name).toBe("Beto");
    const appt = await Appointment.findById(offered!.appointment);
    expect(appt!.status).toBe("pending_payment");
    const minutes = (appt!.holdExpiresAt!.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(14);
    expect(minutes).toBeLessThanOrEqual(15);

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("5491160000002");
    expect(sent[0].text).toContain("15 minutos");
    expect(sent[0].text).toContain(appt!.code);
    expect(await WaitlistEntry.countDocuments({ status: "waiting" })).toBe(1); // Cata sigue esperando
  });

  it("si no lo toma a tiempo, el aviso pasa al siguiente", async () => {
    await Appointment.updateMany({ status: "pending_payment" }, { holdExpiresAt: new Date(Date.now() - 1000) });
    await expireHolds();

    expect(await WaitlistEntry.countDocuments({ status: "expired" })).toBe(1);
    const offered = await WaitlistEntry.findOne({ status: "offered" }).populate("client");
    expect((offered!.client as unknown as { name: string }).name).toBe("Cata");
    expect(sent.map((m) => m.to)).toEqual(["5491160000003"]);
  });

  it("al aprobar la seña la entrada queda como tomada y el admin la ve en el listado", async () => {
    const offered = await WaitlistEntry.findOne({ status: "offered" });
    await request(app).post(`/api/v1/admin/appointments/${offered!.appointment}/approve-deposit`).set(ctx.auth).send({});
    const list = await request(app).get("/api/v1/admin/waitlist").set(ctx.auth).query({ date });
    expect(list.status).toBe(200);
    expect(list.body.items.map((i: { status: string }) => i.status).sort()).toEqual(["booked", "expired"]);
  });

  it("sin sesión no se accede al listado", async () => {
    expect((await request(app).get("/api/v1/admin/waitlist")).status).toBe(401);
  });

  it("si nadie espera, cancelar no avisa a nadie", async () => {
    const other = nextWeekday(1, 2);
    const r = await request(app).post("/api/v1/public/bookings").send({ ...ids(), barber: String(ctx.lucas._id), date: other, time: "11:00", customer: { name: "Dani", phone: "11 6000-0009" } });
    await request(app).post(`/api/v1/public/bookings/${r.body.code}/cancel`).query({ token: r.body.token }).send({});
    expect(sent).toHaveLength(0);
  });
});
