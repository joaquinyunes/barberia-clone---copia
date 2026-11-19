import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { Client } from "../src/modules/clients/client.model.js";
import { User } from "../src/modules/users/user.model.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
let reception: { Authorization: string };
let manager: { Authorization: string };
let barber: { Authorization: string };
let clientId: string;
let apptId: string;

async function auth(email: string, role: string, extra: Record<string, unknown> = {}) {
  await User.create({ name: email, email, passwordHash: await bcrypt.hash("clave-larga-12345", 4), role, ...extra });
  const l = await request(app).post("/api/v1/auth/login").send({ email, password: "clave-larga-12345" });
  return { Authorization: `Bearer ${l.body.accessToken}` };
}

beforeAll(async () => {
  ctx = await seedBase();
  reception = await auth("rec@jack.test", "reception");
  manager = await auth("man@jack.test", "manager");
  barber = await auth("bar@jack.test", "barber", { barber: ctx.lucas._id });
  const b = await request(app)
    .post("/api/v1/public/bookings")
    .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date: nextWeekday(2, 4), time: "11:00", customer: { name: "Cliente Con Notas", phone: "11 4400-0001", email: "notas@mail.com" } });
  const a = await Appointment.findOne({ code: b.body.code });
  apptId = String(a!._id);
  clientId = String(a!.client);
  await Client.updateOne({ _id: clientId }, { $push: { internalNotes: { text: "Cliente conflictivo, no dar crédito", by: "Dueño" } } });
});

describe("cada rol ve solo lo que le corresponde (media 7 y 16 de la revisión)", () => {
  it("las notas internas del cliente solo las ve quien tiene clients.notes", async () => {
    const hidden = /conflictivo/;
    expect(JSON.stringify((await request(app).get(`/api/v1/admin/clients/${clientId}`).set(reception)).body)).not.toMatch(hidden);
    expect(JSON.stringify((await request(app).get("/api/v1/admin/clients").set(reception)).body)).not.toMatch(hidden);
    expect(JSON.stringify((await request(app).get(`/api/v1/admin/clients/${clientId}/profile`).set(reception)).body)).not.toMatch(hidden);
    expect(JSON.stringify((await request(app).get(`/api/v1/admin/clients/${clientId}/profile`).set(manager)).body)).toMatch(hidden);
    expect(JSON.stringify((await request(app).get(`/api/v1/admin/clients/${clientId}`).set(ctx.auth)).body)).toMatch(hidden);
  });

  it("un barbero ve su turno con los datos mínimos del cliente, sin notas ni email, y sin las comisiones del servicio ni del barbero", async () => {
    const r = await request(app).get(`/api/v1/admin/appointments/${apptId}`).set(barber);
    expect(r.status).toBe(200);
    const txt = JSON.stringify(r.body);
    expect(txt).not.toMatch(/conflictivo|notas@mail\.com/);
    expect(r.body.client.name).toBe("Cliente Con Notas");
    expect(r.body.service.commission).toBeUndefined();
    expect(r.body.service.supplyCost).toBeUndefined();
    expect(r.body.barber.defaultCommissionPct).toBeUndefined();
    expect(r.body.barber.hourlyRate).toBeUndefined();
  });

  it("comisiones, valor hora y PIN del barbero: solo con finance.manage (lectura y escritura)", async () => {
    const list = await request(app).get("/api/v1/admin/barbers").set(manager);
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body)).not.toMatch(/defaultCommissionPct|hourlyRate|commissionByCategory|attendancePin/);
    const own = await request(app).get("/api/v1/admin/barbers").set(ctx.auth);
    expect(JSON.stringify(own.body)).toMatch(/defaultCommissionPct/);
    expect((await request(app).patch(`/api/v1/admin/barbers/${ctx.lucas._id}`).set(manager).send({ defaultCommissionPct: 90 })).status).toBe(403);
    expect((await request(app).patch(`/api/v1/admin/barbers/${ctx.lucas._id}`).set(manager).send({ hourlyRate: 99999 })).status).toBe(403);
    expect((await request(app).patch(`/api/v1/admin/barbers/${ctx.lucas._id}`).set(manager).send({ bio: "Nueva bio" })).status).toBe(200);
    expect((await request(app).patch(`/api/v1/admin/barbers/${ctx.lucas._id}`).set(ctx.auth).send({ defaultCommissionPct: 55 })).status).toBe(200);
    const summary = await request(app).get(`/api/v1/admin/barbers/${ctx.lucas._id}/summary`).set(manager);
    expect(JSON.stringify(summary.body.barber ?? {})).not.toMatch(/defaultCommissionPct|hourlyRate/);
  });
});
