import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { Client } from "../src/modules/clients/client.model.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const d = nextWeekday(2, 5);
const [y, m, day] = d.split("-");
const ar = `${day}/${m}/${y}`; // formato argentino
const imp = (csv: string) => request(app).post("/api/v1/admin/appointments/import").set(ctx.auth).send({ csv });

beforeAll(async () => {
  ctx = await seedBase();
});

describe("importar la agenda por CSV desde la herramienta anterior (Extra)", () => {
  it("crea los turnos futuros confirmados, sin seña, y informa cada fila que no se pudo importar", async () => {
    const csv = [
      "fecha,hora,nombre,teléfono,servicio,barbero",
      `${d},10:00,Ana Gómez,11 5100-0001,fade,lucas`,
      `${ar},11:00,Luis Paz,11 5100-0002,Barba,Lucas`, // fecha dd/mm/aaaa
      `${d},10:00,Eva Roca,11 5100-0003,Fade,Lucas`, // mismo horario: choca con el primero
      `${d},12:00,Sin Servicio,11 5100-0004,Tintura,Lucas`, // servicio que no existe
      `${d},13:00,Sin Barbero,11 5100-0005,Fade,Nadie`, // barbero que no existe
      `2020-01-01,10:00,Pasado,11 5100-0006,Fade,Lucas`, // histórico: no se importa
      `${d},9:5,Hora Mala,11 5100-0007,Fade,Lucas`,
      `${d},14:00,X,123,Fade,Lucas`,
    ].join("\n");
    const r = await imp(csv);
    expect(r.status).toBe(200);
    expect(r.body.created).toBe(2);
    expect(r.body.invalid.map((i: { line: number }) => i.line)).toEqual([4, 5, 6, 7, 8, 9]);
    expect(r.body.invalid.find((i: { line: number }) => i.line === 4).reason).toMatch(/horario/i);
    expect(r.body.invalid.find((i: { line: number }) => i.line === 7).reason).toMatch(/pasado|historial/i);
    const a = await Appointment.findOne({ createdBy: /Importación/ , startsAt: { $gte: new Date(`${d}T00:00:00Z`) } }).populate("client");
    expect(a!.status).toBe("confirmed");
    expect(a!.deposit.required).toBe(0);
    expect(await Appointment.countDocuments({ status: "confirmed", source: "admin" })).toBe(2);
    expect(await Client.countDocuments({ phone: { $in: ["5491151000001", "5491151000002"] } })).toBe(2);
    // importar de nuevo el mismo archivo no duplica: los horarios ya están ocupados
    const again = await imp(csv);
    expect(again.body.created).toBe(0);
  });

  it("sin las columnas obligatorias no importa nada; y solo con permiso de turnos", async () => {
    const bad = await imp("color,talle\nrojo,M");
    expect(bad.body.created).toBe(0);
    expect(bad.body.invalid[0].reason).toMatch(/columnas/);
    expect((await request(app).post("/api/v1/admin/appointments/import").send({ csv: "a,b\n1,2" })).status).toBe(401);
  });
});
