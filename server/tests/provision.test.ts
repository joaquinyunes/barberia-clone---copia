import { readFileSync } from "node:fs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { clientConfig, provision } from "../src/tools/provision.js";
import { app } from "./fixtures.js";

describe("V4: alta de una barbería nueva en una base vacía", () => {
  it("crea todo lo necesario, el dueño entra con la contraseña generada y la reserva online funciona; no corre dos veces", async () => {
    const cfg = clientConfig.parse(JSON.parse(readFileSync(new URL("../../docs/cliente.ejemplo.json", import.meta.url), "utf8")));
    const { password } = await provision(cfg);
    expect(password.length).toBeGreaterThanOrEqual(16);

    const login = await request(app).post("/api/v1/auth/login").send({ email: cfg.owner.email, password });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("admin");

    const site = await request(app).get("/api/v1/public/site");
    expect(site.body.businessName).toBe("Barbería Ejemplo");
    const [loc] = (await request(app).get("/api/v1/public/locations")).body;
    const [svc] = (await request(app).get(`/api/v1/public/services?location=${loc._id}`)).body;
    expect(loc.name).toBe("Sede Centro");
    const day = new Date(Date.now() + 3 * 86_400_000);
    while (day.getUTCDay() === 0) day.setUTCDate(day.getUTCDate() + 1); // el ejemplo no abre los domingos
    const av = await request(app).get("/api/v1/public/availability").query({ location: loc._id, service: svc._id, date: day.toISOString().slice(0, 10) });
    expect(av.body.slots.length).toBeGreaterThan(0);

    await expect(provision(cfg)).rejects.toThrow(/base vacía/);
  });
});
