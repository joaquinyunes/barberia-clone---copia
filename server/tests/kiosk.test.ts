import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditLog } from "../src/modules/audit/audit.model.js";
import { Attendance } from "../src/modules/staff/staff.models.js";
import { Barber } from "../src/modules/barbers/barber.model.js";
import { app, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const kiosk = (body: Record<string, unknown>) => request(app).post("/api/v1/kiosk/attendance").send(body);
const body = (name: string, slug: string, extra: Record<string, unknown> = {}) => ({ name, slug, location: "", ...extra });

beforeAll(async () => {
  ctx = await seedBase();
});
afterAll(() => {
  delete process.env.RATE_LIMIT_IN_TEST;
});

describe("fichaje con PIN (alta de la revisión de seguridad)", () => {
  it("el PIN tiene 6 a 8 dígitos, se guarda hasheado y no puede repetirse entre barberos", async () => {
    const mk = (name: string, slug: string, pin: string) => request(app).post("/api/v1/admin/barbers").set(ctx.auth).send({ ...body(name, slug), location: String(ctx.location._id), attendancePin: pin });
    expect((await mk("Corto", "corto", "1234")).status).toBe(400);
    expect((await mk("Corto5", "corto5", "12345")).status).toBe(400);
    const ok = await mk("Pedro", "pedro", "482916");
    expect(ok.status).toBe(201);
    const stored = await Barber.findOne({ slug: "pedro" }).select("+attendancePin");
    expect(stored!.attendancePin).toMatch(/^\$2[aby]\$/);
    expect(stored!.attendancePin).not.toContain("482916");
    const dup = await mk("Juan", "juan", "482916");
    expect(dup.status).toBe(409);
    expect(JSON.stringify(await AuditLog.find().lean())).not.toMatch(/\$2[aby]\$|482916/); // ni el PIN ni su hash en la bitácora
  });

  it("el kiosco pide el barbero junto con el PIN: con el PIN de otro no se ficha", async () => {
    const lucas = await Barber.findById(ctx.lucas._id);
    lucas!.attendancePin = "777123";
    await lucas!.save();
    const pedro = await Barber.findOne({ slug: "pedro" });
    expect((await kiosk({ pin: "777123", action: "in" })).status).toBe(400); // sin barbero
    expect((await kiosk({ barber: String(pedro!._id), pin: "777123", action: "in" })).status).toBe(401); // PIN de otro
    const ok = await kiosk({ barber: String(ctx.lucas._id), pin: "777123", action: "in" });
    expect(ok.status).toBe(200);
    expect(ok.body.barber).toBe("Lucas");
    expect(await Attendance.countDocuments({ barber: ctx.lucas._id })).toBe(1);
  });

  it("5 PIN incorrectos bloquean ese barbero 15 min (también el correcto), de forma atómica", async () => {
    const pedro = await Barber.findOne({ slug: "pedro" });
    await Promise.all(Array.from({ length: 6 }, () => kiosk({ barber: String(pedro!._id), pin: "000000", action: "in" })));
    const locked = await kiosk({ barber: String(pedro!._id), pin: "482916", action: "in" });
    expect(locked.status).toBe(401);
    expect(await Attendance.countDocuments({ barber: pedro!._id })).toBe(0);
    await Barber.updateOne({ _id: pedro!._id }, { pinLockUntil: new Date(Date.now() - 1000) });
    expect((await kiosk({ barber: String(pedro!._id), pin: "482916", action: "in" })).status).toBe(200);
  });

  it("el kiosco tiene límite de tasa por IP", async () => {
    process.env.RATE_LIMIT_IN_TEST = "1";
    const codes: number[] = [];
    for (let i = 0; i < 14; i++) codes.push((await kiosk({ barber: String(ctx.lucas._id), pin: "999999", action: "in" })).status);
    delete process.env.RATE_LIMIT_IN_TEST;
    expect(codes).toContain(429);
  });

  it("un PIN viejo guardado en texto plano (formato de antes) ya no sirve hasta que se vuelva a cargar", async () => {
    await Barber.collection.updateOne({ _id: ctx.lucas._id }, { $set: { attendancePin: "1001", pinLockUntil: null, pinFailed: 0 } });
    expect((await kiosk({ barber: String(ctx.lucas._id), pin: "100100", action: "in" })).status).toBe(401);
  });
});
