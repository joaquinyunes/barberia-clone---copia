import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { AuditLog } from "../src/modules/audit/audit.model.js";
import { User } from "../src/modules/users/user.model.js";
import { app, seedBase } from "./fixtures.js";

const cookieOf = (res: { headers: Record<string, unknown> }) => {
  const raw = (res.headers["set-cookie"] as string[] | undefined)?.find((c) => c.startsWith("jeb_refresh="));
  return raw?.split(";")[0];
};
const refresh = (cookie?: string) => request(app).post("/api/v1/auth/refresh").set("Cookie", cookie ?? "");
const login = (email: string) => request(app).post("/api/v1/auth/login").send({ email, password: "clave-larga-12345" });

beforeAll(async () => {
  await seedBase();
  await User.create({ name: "Rot", email: "rot@jack.test", passwordHash: await bcrypt.hash("clave-larga-12345", 4), role: "reception" });
});

describe("rotación del refresh token con detección de reuso (baja de la revisión)", () => {
  it("cada refresh entrega un token nuevo y el anterior deja de servir", async () => {
    const c0 = cookieOf(await login("rot@jack.test"))!;
    const r1 = await refresh(c0);
    expect(r1.status).toBe(200);
    const c1 = cookieOf(r1)!;
    expect(c1).toBeTruthy();
    expect(c1).not.toBe(c0);
    const r2 = await refresh(c1);
    expect(r2.status).toBe(200);
    const c2 = cookieOf(r2)!;
    expect(c2).not.toBe(c1);
    expect((await refresh(c2)).status).toBe(200);
  });

  it("reusar un token ya rotado es robo probable: se revoca TODA la sesión (también el token nuevo) y queda auditado", async () => {
    const c0 = cookieOf(await login("rot@jack.test"))!;
    const c1 = cookieOf(await refresh(c0))!;
    const reuse = await refresh(c0); // el atacante (o el dueño) presenta el viejo
    expect(reuse.status).toBe(401);
    expect((await refresh(c1)).status).toBe(401); // el nuevo también murió
    expect(await AuditLog.countDocuments({ summary: /reutiliz/i })).toBeGreaterThanOrEqual(1);
    // se puede volver a ingresar normalmente
    expect((await refresh(cookieOf(await login("rot@jack.test"))!)).status).toBe(200);
  });

  it("dos refresh simultáneos con el mismo token: solo uno gana (el otro es reuso)", async () => {
    const c0 = cookieOf(await login("rot@jack.test"))!;
    const rs = await Promise.all([refresh(c0), refresh(c0)]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 401]);
  });

  it("varios dispositivos a la vez: cada uno tiene su propia cadena y no se pisan", async () => {
    const phone = cookieOf(await login("rot@jack.test"))!;
    const laptop = cookieOf(await login("rot@jack.test"))!;
    expect((await refresh(phone)).status).toBe(200);
    expect((await refresh(laptop)).status).toBe(200);
  });

  it("cerrar sesión en todos los dispositivos invalida las cadenas, y sin cookie no hay sesión", async () => {
    const l = await login("rot@jack.test");
    const c = cookieOf(l)!;
    await request(app).post("/api/v1/auth/logout-all").set({ Authorization: `Bearer ${l.body.accessToken}` });
    expect((await refresh(c)).status).toBe(401);
    expect((await refresh()).status).toBe(401);
  });
});
