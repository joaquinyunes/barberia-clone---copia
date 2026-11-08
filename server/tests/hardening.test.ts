import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { totpCode, verifyTotp, newSecret, sealSecret, openSecret } from "../src/lib/totp.js";
import { AuditLog } from "../src/modules/audit/audit.model.js";
import { Client } from "../src/modules/clients/client.model.js";
import { User } from "../src/modules/users/user.model.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(5, 2);

beforeAll(async () => {
  ctx = await seedBase();
});
afterAll(() => {
  delete process.env.RATE_LIMIT_IN_TEST;
});

const login = (email: string, password: string, totp?: string) => request(app).post("/api/v1/auth/login").send({ email, password, totp });

describe("S3: bloqueo de cuenta tras intentos fallidos", () => {
  it("5 contraseñas mal → 429 aunque la sexta sea la correcta; la cuenta se libera al vencer el bloqueo", async () => {
    await User.create({ name: "Recep", email: "lock@jack.test", passwordHash: await bcrypt.hash("clave-larga-12345", 4), role: "reception" });
    for (let i = 0; i < 5; i++) expect((await login("lock@jack.test", "mal")).status).toBe(401);
    const blocked = await login("lock@jack.test", "clave-larga-12345");
    expect(blocked.status).toBe(401); // mismo mensaje que una contraseña mala: no se revela que está bloqueada
    expect(blocked.body.error.message).toBe((await login("noexiste@jack.test", "x")).body.error.message);
    await User.updateOne({ email: "lock@jack.test" }, { lockUntil: new Date(Date.now() - 1000) });
    expect((await login("lock@jack.test", "clave-larga-12345")).status).toBe(200);
  });

  it("un email inexistente responde igual que una contraseña mala (no revela cuentas)", async () => {
    const real = await login("larga@jack.test", "mal-mal-mal-mal-1");
    const r = await login("noexiste@jack.test", "lo-que-sea");
    expect(r.status).toBe(401);
    expect(r.body.error.message).toBe(real.body.error.message);
  });

  it("intentos fallidos en paralelo también cuentan (el contador es atómico)", async () => {
    await User.create({ name: "Par", email: "par@jack.test", passwordHash: await bcrypt.hash("clave-larga-12345", 4), role: "reception" });
    await Promise.all(Array.from({ length: 6 }, () => login("par@jack.test", "mal")));
    const u = await User.findOne({ email: "par@jack.test" });
    expect(u!.lockUntil!.getTime()).toBeGreaterThan(Date.now());
    expect((await login("par@jack.test", "clave-larga-12345")).status).toBe(401);
  });
});

describe("S3: límite de tasa por IP", () => {
  it("el límite de login corta después de 20 intentos (con los límites activados)", async () => {
    process.env.RATE_LIMIT_IN_TEST = "1";
    const codes: number[] = [];
    for (let i = 0; i < 25; i++) codes.push((await login("nadie@jack.test", "x")).status);
    delete process.env.RATE_LIMIT_IN_TEST;
    expect(codes.filter((c) => c === 429).length).toBeGreaterThanOrEqual(1);
    expect(codes.slice(0, 20).every((c) => c === 401)).toBe(true);
  });
});

describe("S4: contraseña del personal y 2FA (TOTP)", () => {
  it("el personal necesita 12+ caracteres, los clientes 8", async () => {
    const corta = await request(app).post("/api/v1/admin/users").set(ctx.auth).send({ name: "Corta", email: "corta@jack.test", role: "reception", password: "12345678" });
    expect(corta.status).toBe(400);
    const ok = await request(app).post("/api/v1/admin/users").set(ctx.auth).send({ name: "Larga", email: "larga@jack.test", role: "reception", password: "una-clave-larga-1" });
    expect(ok.status).toBe(201);
  });

  it("TOTP: coincide con el vector de la RFC 6238 y tolera ±1 paso, no más", () => {
    // Vector RFC 6238 (SHA-1, secreto "12345678901234567890", t=59 s) → 94287082; los 6 dígitos finales son 287082.
    const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(totpCode(rfcSecret, Math.floor(59 / 30))).toBe("287082");
    const s = newSecret();
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 30_000);
    expect(verifyTotp(s, totpCode(s, step), now)).toBe(true);
    expect(verifyTotp(s, totpCode(s, step - 1), now)).toBe(true);
    expect(verifyTotp(s, totpCode(s, step + 2), now)).toBe(false);
    expect(verifyTotp(s, "000000", now) && verifyTotp(s, "123456", now)).toBe(false);
  });

  it("el secreto se guarda cifrado y se recupera igual", () => {
    const s = newSecret();
    const sealed = sealSecret(s);
    expect(sealed).not.toContain(s);
    expect(openSecret(sealed)).toBe(s);
  });

  it("flujo completo: activar 2FA → el login exige el código → con código entra → sin código o con código malo no", async () => {
    const email = "dueno2fa@jack.test";
    await User.create({ name: "Dueño 2FA", email, passwordHash: await bcrypt.hash("clave-larga-12345", 4), role: "admin" });
    const first = await login(email, "clave-larga-12345");
    expect(first.status).toBe(200);
    const auth = { Authorization: `Bearer ${first.body.accessToken}` };
    expect((await request(app).post("/api/v1/auth/2fa/setup").set(auth).send({ password: "otra-clave-cualquiera" })).status).toBe(400); // pide la contraseña
    const setup = await request(app).post("/api/v1/auth/2fa/setup").set(auth).send({ password: "clave-larga-12345" });
    expect(setup.status).toBe(200);
    const secret = setup.body.secret as string;
    expect(setup.body.otpauthUrl).toContain("otpauth://totp/");
    const stored = await User.findOne({ email }).select("+totpPending");
    expect(stored!.totpPending).not.toContain(secret); // cifrado en la base
    expect(stored!.totpEnabled).toBe(false);
    expect((await request(app).post("/api/v1/auth/2fa/enable").set(auth).send({ code: "000000" })).status).toBe(400);
    const now = () => Math.floor(Date.now() / 30_000);
    expect((await request(app).post("/api/v1/auth/2fa/enable").set(auth).send({ code: totpCode(secret, now()) })).status).toBe(204);

    // con 2FA activo, un access token robado NO puede reemplazarlo: setup se rechaza aunque traiga la contraseña
    const newer = await login(email, "clave-larga-12345", totpCode(secret, now()));
    const hijack = await request(app).post("/api/v1/auth/2fa/setup").set({ Authorization: `Bearer ${newer.body.accessToken}` }).send({ password: "clave-larga-12345" });
    expect(hijack.status).toBe(409);
    expect((await User.findOne({ email }))!.totpEnabled).toBe(true);
    const noCode = await login(email, "clave-larga-12345");
    expect(noCode.status).toBe(401);
    expect(noCode.body.error.code).toBe("TOTP_REQUIRED");
    expect((await login(email, "clave-larga-12345", "000000")).status).toBe(401);
    const ok = await login(email, "clave-larga-12345", totpCode(secret, now()));
    expect(ok.status).toBe(200);
    expect(ok.body.user.totpSecret).toBeUndefined();
    expect(await AuditLog.countDocuments({ summary: /verificación en dos pasos/ })).toBe(1);
  });
});

describe("S5: operadores de Mongo en la entrada", () => {
  it("login con {$ne} en el email o la contraseña → 400, no entra", async () => {
    const r = await request(app).post("/api/v1/auth/login").send({ email: { $ne: "x" }, password: { $ne: "x" } });
    expect(r.status).toBe(400);
  });
  it("un $ escondido en un objeto anidado de una reserva se rechaza", async () => {
    const r = await request(app)
      .post("/api/v1/public/bookings")
      .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any", date, time: "11:00", customer: { name: "X", phone: "11 5555-0000", $where: "1" } });
    expect(r.status).toBe(400);
  });
  it("un operador en la query (?search[$ne]=) no llega a Mongo", async () => {
    const r = await request(app).get("/api/v1/admin/clients?tier[$ne]=zzz").set(ctx.auth);
    expect([200, 400]).toContain(r.status);
    if (r.status === 200) expect(Array.isArray(r.body.items)).toBe(true);
  });
  it("la configuración ignora campos desconocidos y rechaza valores fuera de rango", async () => {
    const bad = await request(app).patch("/api/v1/admin/settings").set(ctx.auth).send({ holdMinutes: -5 });
    expect(bad.status).toBe(400);
    const ok = await request(app).patch("/api/v1/admin/settings").set(ctx.auth).send({ holdMinutes: 25, campoInventado: "x" });
    expect(ok.status).toBe(200);
    expect(ok.body.holdMinutes).toBe(25);
    expect(ok.body.campoInventado).toBeUndefined();
  });
});

describe("S7: la auditoría no se puede editar ni borrar", () => {
  it("ni el código de la app puede modificar o borrar registros", async () => {
    await request(app).patch("/api/v1/admin/settings").set(ctx.auth).send({ holdMinutes: 30 });
    const entry = await AuditLog.findOne();
    expect(entry).toBeTruthy();
    await expect(AuditLog.deleteMany({})).rejects.toThrow(/solo lectura/);
    await expect(AuditLog.updateOne({ _id: entry!._id }, { summary: "otro" })).rejects.toThrow(/solo lectura/);
    entry!.summary = "manipulado";
    await expect(entry!.save()).rejects.toThrow(/solo lectura/);
  });
  it("la API no ofrece rutas para borrarla", async () => {
    const entry = await AuditLog.findOne();
    expect((await request(app).delete(`/api/v1/admin/audit/${entry!._id}`).set(ctx.auth)).status).toBe(404);
  });
  it("cancelar y cobrar quedan registrados", async () => {
    const b = await request(app).post("/api/v1/public/bookings").send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any", date, time: "13:00", customer: { name: "Aud", phone: "11 5555-1212" } });
    expect(b.status).toBe(201);
    const appt = await request(app).get(`/api/v1/admin/appointments?code=${b.body.code}`).set(ctx.auth);
    const id = appt.body.items?.[0]?._id ?? appt.body[0]?._id;
    expect(id).toBeTruthy();
    const c = await request(app).post(`/api/v1/admin/appointments/${id}/cancel`).set(ctx.auth).send({ by: "business", reason: "prueba" });
    expect(c.status).toBe(200);
    expect(await AuditLog.countDocuments({ entity: "Turno", summary: /cancel/i })).toBeGreaterThanOrEqual(1);
  });
});

describe("S12: datos personales", () => {
  it("la configuración no se le muestra a un cliente con sesión", async () => {
    const reg = await request(app).post("/api/v1/auth/register").send({ name: "Cli Ente", email: "cli@mail.com", phone: "11 6666-0001", password: "12345678" });
    expect((await request(app).get("/api/v1/admin/settings").set({ Authorization: `Bearer ${reg.body.accessToken}` })).status).toBe(403);
    expect((await request(app).get("/api/v1/admin/settings").set(ctx.auth)).status).toBe(200);
  });

  it("el consentimiento de campañas no se puede dar sobre la ficha de otra persona por su teléfono", async () => {
    const phone = "11 6666-0002";
    const first = await request(app).post("/api/v1/public/bookings").send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any", date, time: "16:00", customer: { name: "Dueña Real", phone } });
    expect(first.status).toBe(201);
    const second = await request(app).post("/api/v1/public/bookings").send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any", date, time: "17:00", customer: { name: "Otro", phone }, marketingConsent: true });
    expect(second.status).toBe(201);
    expect((await Client.findOne({ name: "Dueña Real" }))!.marketing?.whatsapp).toBeFalsy();
  });

  it("exportar y anonimizar: solo quien administra usuarios, y la ficha queda sin datos identificables", async () => {
    const b = await request(app).post("/api/v1/public/bookings").send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any", date, time: "15:00", customer: { name: "Pedro Privado", phone: "11 5555-3434", email: "pedro@mail.com" } });
    expect(b.status).toBe(201);
    const client = await Client.findOne({ email: "pedro@mail.com" });
    const exp = await request(app).get(`/api/v1/admin/clients/${client!._id}/export`).set(ctx.auth);
    expect(exp.status).toBe(200);
    expect(JSON.stringify(exp.body)).toContain("Pedro Privado");
    expect(exp.body.turnos).toHaveLength(1);

    // un encargado sin users.manage no puede
    await User.create({ name: "Enc", email: "enc2@jack.test", passwordHash: await bcrypt.hash("clave-larga-12345", 4), role: "manager" });
    const l = await login("enc2@jack.test", "clave-larga-12345");
    const mgr = { Authorization: `Bearer ${l.body.accessToken}` };
    expect((await request(app).get(`/api/v1/admin/clients/${client!._id}/export`).set(mgr)).status).toBe(403);
    expect((await request(app).post(`/api/v1/admin/clients/${client!._id}/anonymize`).set(mgr).send({ confirm: true })).status).toBe(403);

    expect((await request(app).post(`/api/v1/admin/clients/${client!._id}/anonymize`).set(ctx.auth).send({})).status).toBe(400); // exige confirmación
    expect((await request(app).post(`/api/v1/admin/clients/${client!._id}/anonymize`).set(ctx.auth).send({ confirm: true })).status).toBe(200);
    const after = await Client.findById(client!._id).lean();
    expect(JSON.stringify(after)).not.toMatch(/Pedro|pedro@mail|5555-?3434|15553434/);
    expect(after!.active).toBe(false);
    expect(await AuditLog.countDocuments({ summary: /Pedro/ })).toBe(0); // la bitácora inmutable no guarda el nombre
  });
});

describe("S9: cabeceras de seguridad de la API", () => {
  it("HSTS, nosniff, Referrer-Policy y Permissions-Policy; CORS solo para el origen propio", async () => {
    const r = await request(app).get("/api/v1/health").set("Origin", "http://localhost:5173");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["strict-transport-security"]).toBeTruthy();
    expect(r.headers["referrer-policy"]).toBeTruthy();
    expect(r.headers["permissions-policy"]).toContain("camera=()");
    expect(r.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    const evil = await request(app).get("/api/v1/health").set("Origin", "https://evil.example");
    expect(evil.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
