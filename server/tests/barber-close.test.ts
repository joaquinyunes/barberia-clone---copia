import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { Movement } from "../src/modules/ledger/ledger.model.js";
import { User } from "../src/modules/users/user.model.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
let barberAuth: { Authorization: string };
const date = nextWeekday(3, 5);
let n = 0;

async function confirmed(phone: string) {
  n += 1;
  const b = await request(app)
    .post("/api/v1/public/bookings")
    .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date, time: `${String(9 + n).padStart(2, "0")}:00`, customer: { name: `Cliente ${n}`, phone } });
  const a = await Appointment.findOne({ code: b.body.code });
  await request(app).post(`/api/v1/admin/appointments/${a!._id}/approve-deposit`).set(ctx.auth).send({});
  return String(a!._id);
}

beforeAll(async () => {
  ctx = await seedBase();
  await User.create({ name: "Lucas", email: "lucas@jack.test", passwordHash: await bcrypt.hash("clave-larga-12345", 4), role: "barber", barber: ctx.lucas._id });
  const l = await request(app).post("/api/v1/auth/login").send({ email: "lucas@jack.test", password: "clave-larga-12345" });
  barberAuth = { Authorization: `Bearer ${l.body.accessToken}` };
  await request(app).post("/api/v1/admin/cash/open").set(ctx.auth).send({ location: String(ctx.location._id), openingAmount: 0 });
});

describe("el barbero no puede cerrar turnos sin cobrar y llevarse la comisión (alta de la revisión)", () => {
  it("sin cobrar el total: 409, sin comisión ni cargo; con el pago completo: 200 y comisión", async () => {
    const id = await confirmed("11 4300-0001"); // total 15.000, seña 5.000 aprobada
    const none = await request(app).post(`/api/v1/admin/appointments/${id}/complete`).set(barberAuth).send({ payments: [] });
    expect(none.status).toBe(409);
    expect(none.body.error.message).toMatch(/cobrar/i);
    const partial = await request(app).post(`/api/v1/admin/appointments/${id}/complete`).set(barberAuth).send({ payments: [{ tender: "cash", amount: 1000 }] });
    expect(partial.status).toBe(409);
    expect(await Movement.countDocuments({ "ref.id": id, type: { $in: ["service_charge", "commission"] } })).toBe(0);
    expect((await Appointment.findById(id))!.status).toBe("confirmed");
    const full = await request(app).post(`/api/v1/admin/appointments/${id}/complete`).set(barberAuth).send({ payments: [{ tender: "cash", amount: 10000 }] });
    expect(full.status).toBe(200);
    expect(await Movement.countDocuments({ "ref.id": id, type: "commission" })).toBe(1);
  });

  it("tampoco puede autorizarse deuda a sí mismo; caja/administración sí puede", async () => {
    const id = await confirmed("11 4300-0002");
    const own = await request(app).post(`/api/v1/admin/appointments/${id}/complete`).set(barberAuth).send({ payments: [], allowDebt: true });
    expect(own.status).toBe(403);
    const admin = await request(app).post(`/api/v1/admin/appointments/${id}/complete`).set(ctx.auth).send({ payments: [], allowDebt: true });
    expect(admin.status).toBe(200);
  });

  it("con saldo a favor suficiente del cliente, el barbero puede cerrar usando «balance»", async () => {
    const id = await confirmed("11 4300-0003");
    const a = await Appointment.findById(id);
    await request(app).post(`/api/v1/admin/clients/${a!.client}/credit`).set(ctx.auth).send({ amount: 20000, concept: "Crédito de prueba" });
    const ok = await request(app).post(`/api/v1/admin/appointments/${id}/complete`).set(barberAuth).send({ payments: [{ tender: "balance", amount: 0 }] });
    expect(ok.status).toBe(200);
  });
});
