import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(2, 2);

async function doneAppointment(service: string, time: string, phone: string) {
  const booked = await request(app)
    .post("/api/v1/admin/appointments")
    .set(ctx.auth)
    .send({ location: String(ctx.location._id), service, barber: String(ctx.lucas._id), date, time, customer: { name: "Cliente", phone } });
  const done = await request(app).post(`/api/v1/admin/appointments/${booked.body._id}/complete`).set(ctx.auth).send({ payments: [], allowDebt: true });
  expect(done.status).toBe(200);
}

beforeAll(async () => {
  ctx = await seedBase();
  await doneAppointment(String(ctx.fade._id), "10:00", "11 4000-0001");
  await doneAppointment(String(ctx.fade._id), "12:00", "11 4000-0002");
  await doneAppointment(String(ctx.beard._id), "14:00", "11 4000-0003");
});

describe("reporte de comisiones por barbero y servicio", () => {
  it("suma lo que ganó cada barbero con el detalle por servicio y su porcentaje real", async () => {
    const r = await request(app).get("/api/v1/admin/reports/commissions").set(ctx.auth).query({ from: new Date(Date.now() - 86_400_000).toISOString(), to: new Date(Date.now() + 86_400_000).toISOString() });
    expect(r.status).toBe(200);
    expect(r.body.totals).toEqual({ services: 3, sales: 38000, commission: 17200 });
    const lucas = r.body.barbers[0];
    expect(lucas.barber.name).toBe("Lucas");
    expect(lucas.commission).toBe(17200); // 2 × 7000 fijos del Fade + 40 % de la barba
    const fade = lucas.services.find((s: { service: string }) => s.service === "Fade");
    expect(fade).toMatchObject({ count: 2, sales: 30000, commission: 14000 });
    const beard = lucas.services.find((s: { service: string }) => s.service === "Barba");
    expect(beard).toMatchObject({ count: 1, sales: 8000, commission: 3200, effectivePct: 40 });
  });

  it("solo lo ve quien tiene permiso de reportes", async () => {
    expect((await request(app).get("/api/v1/admin/reports/commissions")).status).toBe(401);
  });
});
