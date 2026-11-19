import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { setNotifier } from "../src/lib/notify/notifier.js";
import { Client, normalizePhone } from "../src/modules/clients/client.model.js";
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

describe("registro: la ficha de un cliente solo se vincula con una prueba de que el celular es tuyo", () => {
  const sent: { to: string; text: string }[] = [];
  const lastCode = (to: string) => /(\d{6})/.exec([...sent].reverse().find((m) => m.to === to)?.text ?? "")?.[1] ?? "";
  beforeAll(() => setNotifier({ send: async (m) => void sent.push({ to: m.to, text: m.text }) }));

  it("registrarse con el celular de otra persona NO da acceso a su ficha ni a sus turnos", async () => {
    const r = await request(app)
      .post("/api/v1/public/bookings")
      .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any", date, time: "15:00", customer: { name: "Atacante", phone: victimPhone, email: "atacante@mail.com" } });
    expect(r.status).toBe(201);
    const reg = await request(app).post("/api/v1/auth/register").send({ name: "Atacante", email: "atacante@mail.com", phone: victimPhone, password: "12345678" });
    expect(reg.status).toBe(201);
    expect(reg.body.pendingClaim).toBe(true);
    expect(reg.body.user.client).toBeUndefined();
    const auth = { Authorization: `Bearer ${reg.body.accessToken}` };
    const me = await request(app).get("/api/v1/me/client").set(auth);
    expect(me.status).toBe(403);
    expect(JSON.stringify(me.body)).not.toMatch(/Víctima|6000|appointments/);
    expect(await Client.countDocuments({ user: reg.body.user._id })).toBe(0);

    // el código se manda al celular DE LA FICHA (la víctima), no a quien se registró
    expect((await request(app).post("/api/v1/me/client/claim/request").set(auth)).status).toBe(204);
    expect(sent.at(-1)!.to).toBe(normalizePhone(victimPhone));
    for (let k = 0; k < 5; k++) expect((await request(app).post("/api/v1/me/client/claim/confirm").set(auth).send({ code: "000000" })).status).toBe(400);
    // con 5 fallos el código se invalida: ni el correcto sirve
    expect((await request(app).post("/api/v1/me/client/claim/confirm").set(auth).send({ code: lastCode(normalizePhone(victimPhone)) })).status).toBe(400);
    expect((await request(app).get("/api/v1/me/client").set(auth)).status).toBe(403);
  });

  it("quien recibe el código en su celular vincula su ficha (una sola vez, el código vence al usarse)", async () => {
    const own = await request(app)
      .post("/api/v1/admin/appointments")
      .set(ctx.auth)
      .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date, time: "17:00", customer: { name: "Ana", phone: "11 6000-2222", email: "ana@mail.com" } });
    expect(own.status).toBe(201);
    const reg = await request(app).post("/api/v1/auth/register").send({ name: "Ana", email: "ana@mail.com", phone: "11 6000-2222", password: "12345678" });
    expect(reg.status).toBe(201);
    const auth = { Authorization: `Bearer ${reg.body.accessToken}` };
    expect((await request(app).get("/api/v1/me/client").set(auth)).status).toBe(403); // aunque el email coincida, hasta verificar no ve nada
    await request(app).post("/api/v1/me/client/claim/request").set(auth);
    const code = lastCode(normalizePhone("11 6000-2222"));
    expect(code).toMatch(/^\d{6}$/);
    expect((await request(app).post("/api/v1/me/client/claim/confirm").set(auth).send({ code })).status).toBe(204);
    const me = await request(app).get("/api/v1/me/client").set(auth);
    expect(me.status).toBe(200);
    expect(me.body.appointments).toHaveLength(1);
    expect((await request(app).post("/api/v1/me/client/claim/confirm").set(auth).send({ code })).status).toBe(409); // ya vinculada
    const again = await request(app).post("/api/v1/auth/register").send({ name: "Ana 2", email: "otra@mail.com", phone: "11 6000-2222", password: "12345678" });
    expect(again.status).toBe(409);
  });

  it("registro: el mensaje es el mismo si el email o el celular ya tienen cuenta (no sirve para averiguar quién es cliente)", async () => {
    const mailTaken = await request(app).post("/api/v1/auth/register").send({ name: "X Y", email: "ana@mail.com", phone: "11 6999-0000", password: "12345678" });
    const phoneTaken = await request(app).post("/api/v1/auth/register").send({ name: "X Y", email: "nuevo-x@mail.com", phone: "11 6000-2222", password: "12345678" });
    expect(mailTaken.status).toBe(409);
    expect(phoneTaken.status).toBe(409);
    expect(mailTaken.body.error.message).toBe(phoneTaken.body.error.message);
  });

  it("el personal puede vincular una cuenta a una ficha tras verificar la identidad en persona (queda auditado)", async () => {
    const c = await Client.create({ name: "Presencial", phone: "5491160009999" });
    const reg = await request(app).post("/api/v1/auth/register").send({ name: "Presencial", email: "pres@mail.com", phone: "11 6000-9999", password: "12345678" });
    expect(reg.body.pendingClaim).toBe(true);
    const link = await request(app).post(`/api/v1/admin/clients/${c._id}/link-user`).set(ctx.auth).send({ user: reg.body.user._id });
    expect(link.status).toBe(204);
    expect((await request(app).get("/api/v1/me/client").set({ Authorization: `Bearer ${reg.body.accessToken}` })).status).toBe(200);
  });
});

describe("usuarios: users.manage sin ser admin no escala privilegios", () => {
  it("no puede crear admins ni otorgar users.manage", async () => {
    await User.create({ name: "Encargado", email: "enc@jack.test", passwordHash: await bcrypt.hash("secreto123", 4), role: "manager", extraPermissions: ["users.manage"] });
    const login = await request(app).post("/api/v1/auth/login").send({ email: "enc@jack.test", password: "secreto123" });
    const auth = { Authorization: `Bearer ${login.body.accessToken}` };

    const admin = await request(app).post("/api/v1/admin/users").set(auth).send({ name: "Nuevo admin", email: "nuevo@jack.test", role: "admin", password: "clave-larga-12345" });
    expect(admin.status).toBe(403);
    const grant = await request(app).post("/api/v1/admin/users").set(auth).send({ name: "Recep", email: "recep@jack.test", role: "reception", extraPermissions: ["users.manage"], password: "clave-larga-12345" });
    expect(grant.status).toBe(403);
    const ok = await request(app).post("/api/v1/admin/users").set(auth).send({ name: "Recep", email: "recep@jack.test", role: "reception", password: "clave-larga-12345" });
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
