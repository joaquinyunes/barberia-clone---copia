import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { Barber } from "../src/modules/barbers/barber.model.js";
import { Location } from "../src/modules/locations/location.model.js";
import { User } from "../src/modules/users/user.model.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

/** Revisión adversaria: una sede no puede ver ni tocar lo de otra (cadenas con varias sedes). */
let ctx: Awaited<ReturnType<typeof seedBase>>;
let sedeB: InstanceType<typeof Location>;
let managerA: { Authorization: string };
let managerAll: { Authorization: string };
let idA: string;
let idB: string;
const date = nextWeekday(2, 5);

async function auth(email: string, locations: unknown[]) {
  await User.create({ name: email, email, passwordHash: await bcrypt.hash("clave-larga-12345", 4), role: "manager", locations });
  const l = await request(app).post("/api/v1/auth/login").send({ email, password: "clave-larga-12345" });
  return { Authorization: `Bearer ${l.body.accessToken}` };
}

beforeAll(async () => {
  ctx = await seedBase();
  sedeB = await Location.create({ slug: "sede-b", name: "Sede B", address: "Calle B 1", whatsapp: "5491155550002", openingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: "09:00", close: "21:00" })) });
  const lucasB = await Barber.create({ name: "Bruno", slug: "bruno", location: sedeB._id, schedule: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start: "09:00", end: "21:00" })), defaultCommissionPct: 50 });
  managerA = await auth("man-a@jack.test", [ctx.location._id]);
  managerAll = await auth("man-all@jack.test", []);
  const mk = async (location: unknown, barber: unknown, time: string, phone: string) => {
    const r = await request(app).post("/api/v1/admin/appointments").set(ctx.auth).send({ location: String(location), service: String(ctx.fade._id), barber: String(barber), date, time, customer: { name: "Cli", phone } });
    expect(r.status).toBe(201);
    return String(r.body._id);
  };
  idA = await mk(ctx.location._id, ctx.lucas._id, "10:00", "11 4300-1001");
  idB = await mk(sedeB._id, lucasB._id, "10:00", "11 4300-1002");
});

describe("alcance por sede (IDOR entre sedes)", () => {
  it("el encargado de la sede A solo ve los turnos de A; el de todas ve ambos", async () => {
    const a = await request(app).get("/api/v1/admin/appointments").set(managerA).query({ date });
    expect(a.status).toBe(200);
    expect(a.body.items.map((x: { _id: string }) => x._id)).toEqual([idA]);
    const all = await request(app).get("/api/v1/admin/appointments").set(managerAll).query({ date });
    expect(all.body.items.map((x: { _id: string }) => x._id).sort()).toEqual([idA, idB].sort());
    // pedir la sede B por filtro tampoco lo deja
    const sneaky = await request(app).get("/api/v1/admin/appointments").set(managerA).query({ date, location: String(sedeB._id) });
    expect(sneaky.body.items).toHaveLength(0);
  });

  it("no puede ver, aprobar, rechazar, reprogramar, cancelar ni finalizar un turno de otra sede (403), y el turno no cambia", async () => {
    const before = await Appointment.findById(idB);
    expect((await request(app).get(`/api/v1/admin/appointments/${idB}`).set(managerA)).status).toBe(403);
    for (const [path, body] of [
      ["approve-deposit", {}],
      ["reject-deposit", { reason: "No va" }],
      ["reschedule", { date, time: "12:00" }],
      ["cancel", { by: "business" }],
      ["complete", { payments: [] }],
    ] as const) {
      expect((await request(app).post(`/api/v1/admin/appointments/${idB}/${path}`).set(managerA).send(body)).status, path).toBe(403);
    }
    const after = await Appointment.findById(idB);
    expect(after!.status).toBe(before!.status);
    expect(after!.startsAt.getTime()).toBe(before!.startsAt.getTime());
    // y en su propia sede sí puede
    expect((await request(app).get(`/api/v1/admin/appointments/${idA}`).set(managerA)).status).toBe(200);
  });

  it("la caja de otra sede tampoco: abrir, ver y listar movimientos", async () => {
    expect((await request(app).post("/api/v1/admin/cash/open").set(managerA).send({ location: String(sedeB._id), openingAmount: 0 })).status).toBe(403);
    expect((await request(app).get("/api/v1/admin/cash/current").set(managerA).query({ location: String(sedeB._id) })).status).toBe(403);
    expect((await request(app).post("/api/v1/admin/cash/open").set(managerA).send({ location: String(ctx.location._id), openingAmount: 0 })).status).toBe(201);
    const mv = await request(app).get("/api/v1/admin/cash/movements").set(managerA).query({ location: String(sedeB._id) });
    expect(mv.body.items ?? []).toHaveLength(0);
  });

  it("no puede crear un turno en otra sede", async () => {
    const r = await request(app).post("/api/v1/admin/appointments").set(managerA).send({ location: String(sedeB._id), service: String(ctx.fade._id), barber: String((await Barber.findOne({ slug: "bruno" }))!._id), date, time: "15:00", customer: { name: "Xy", phone: "11 4300-1003" } });
    expect(r.status, JSON.stringify(r.body)).toBe(403);
  });
});
