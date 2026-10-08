import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { User } from "../src/modules/users/user.model.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(3, 2);
const victimPhone = "11 6000-1111";

beforeAll(async () => {
  ctx = await seedBase();
  // La víctima reservó como invitada, sin email.
  const r = await request(app)
    .post("/api/v1/public/bookings")
    .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any", date, time: "11:00", customer: { name: "Víctima", phone: victimPhone } });
  expect(r.status).toBe(201);
});

describe("registro: no se puede tomar la ficha de otro cliente por su celular", () => {
  it("una reserva pública no escribe el email de una ficha existente", async () => {
    const r = await request(app)
      .post("/api/v1/public/bookings")
      .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any", date, time: "15:00", customer: { name: "Atacante", phone: victimPhone, email: "atacante@mail.com" } });
    expect(r.status).toBe(201);
    const reg = await request(app).post("/api/v1/auth/register").send({ name: "Atacante", email: "atacante@mail.com", phone: victimPhone, password: "12345678" });
    expect(reg.status).toBe(409);
  });

  it("vincula la ficha cuando el email coincide con el que ya tenía, y solo una vez", async () => {
    const own = await request(app)
      .post("/api/v1/admin/appointments")
      .set(ctx.auth)
      .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date, time: "17:00", customer: { name: "Ana", phone: "11 6000-2222", email: "ana@mail.com" } });
    expect(own.status).toBe(201);
    const reg = await request(app).post("/api/v1/auth/register").send({ name: "Ana", email: "ana@mail.com", phone: "11 6000-2222", password: "12345678" });
    expect(reg.status).toBe(201);
    const me = await request(app).get("/api/v1/me/client").set({ Authorization: `Bearer ${reg.body.accessToken}` });
    expect(me.body.appointments).toHaveLength(1);

    const again = await request(app).post("/api/v1/auth/register").send({ name: "Ana 2", email: "otra@mail.com", phone: "11 6000-2222", password: "12345678" });
    expect(again.status).toBe(409);
  });
});

describe("usuarios: users.manage sin ser admin no escala privilegios", () => {
  it("no puede crear admins ni otorgar users.manage", async () => {
    await User.create({ name: "Encargado", email: "enc@jack.test", passwordHash: await bcrypt.hash("secreto123", 4), role: "manager", extraPermissions: ["users.manage"] });
    const login = await request(app).post("/api/v1/auth/login").send({ email: "enc@jack.test", password: "secreto123" });
    const auth = { Authorization: `Bearer ${login.body.accessToken}` };

    const admin = await request(app).post("/api/v1/admin/users").set(auth).send({ name: "Nuevo admin", email: "nuevo@jack.test", role: "admin", password: "12345678" });
    expect(admin.status).toBe(403);
    const grant = await request(app).post("/api/v1/admin/users").set(auth).send({ name: "Recep", email: "recep@jack.test", role: "reception", extraPermissions: ["users.manage"], password: "12345678" });
    expect(grant.status).toBe(403);
    const ok = await request(app).post("/api/v1/admin/users").set(auth).send({ name: "Recep", email: "recep@jack.test", role: "reception", password: "12345678" });
    expect(ok.status).toBe(201);

    const owner = await User.findOne({ role: "admin" });
    const hijack = await request(app).patch(`/api/v1/admin/users/${owner!._id}`).set(auth).send({ password: "tomado123" });
    expect(hijack.status).toBe(403);
  });
});

describe("comprobantes", () => {
  it("un archivo de más de 5 MB responde 413 con un mensaje claro, no 500", async () => {
    const b = await request(app)
      .post("/api/v1/public/bookings")
      .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any", date, time: "19:00", customer: { name: "Pesado", phone: "11 6000-3333" } });
    const big = Buffer.alloc(6 * 1024 * 1024, 0);
    const r = await request(app).post(`/api/v1/public/bookings/${b.body.code}/receipt`).query({ token: b.body.token }).attach("receipt", big, "enorme.png");
    expect(r.status).toBe(413);
    expect(r.body.error.code).toBe("UPLOAD");
  });
});
