import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
let me: Record<string, string>;
const date = nextWeekday(2, 2);

async function registerCustomer(email: string, phone: string) {
  const r = await request(app).post("/api/v1/auth/register").send({ name: "Nico Habitual", email, phone, password: "secreto123" });
  expect(r.status).toBe(201);
  return { Authorization: `Bearer ${r.body.accessToken}` };
}

beforeAll(async () => {
  ctx = await seedBase();
  me = await registerCustomer("nico@mail.com", "11 5000-0001");
});

describe("«Lo mismo que la última vez»", () => {
  it("sin visitas previas no hay nada que repetir", async () => {
    const r = await request(app).get("/api/v1/me/client/last-cut").set(me);
    expect(r.status).toBe(200);
    expect(r.body.lastCut).toBeNull();
  });

  it("después de un corte, el cliente ve servicio, barbero, nota y horarios sugeridos", async () => {
    const booked = await request(app)
      .post("/api/v1/admin/appointments")
      .set(ctx.auth)
      .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date, time: "11:00", customer: { name: "Nico Habitual", phone: "11 5000-0001" } });
    expect(booked.status).toBe(201);
    const done = await request(app).post(`/api/v1/admin/appointments/${booked.body._id}/complete`).set(ctx.auth).send({ payments: [], allowDebt: true, cutNote: "Máquina 2 a los costados, tijera arriba" });
    expect(done.status).toBe(200);

    const r = await request(app).get("/api/v1/me/client/last-cut").set(me);
    expect(r.status).toBe(200);
    expect(r.body.lastCut.service.name).toBe("Fade");
    expect(r.body.lastCut.barber.name).toBe("Lucas");
    expect(r.body.lastCut.note).toBe("Máquina 2 a los costados, tijera arriba");
    expect(r.body.suggestions).toHaveLength(3);
    for (const s of r.body.suggestions) expect(s.date > new Date().toISOString().slice(0, 10)).toBe(true);
  });

  it("reserva con un toque el mismo servicio y barbero, con la nota en el turno", async () => {
    const last = await request(app).get("/api/v1/me/client/last-cut").set(me);
    const pick = last.body.suggestions[0];
    const r = await request(app).post("/api/v1/me/client/repeat-last-cut").set(me).send({ date: pick.date, time: pick.time });
    expect(r.status).toBe(201);
    expect(r.body.code).toBeTruthy();
    expect(r.body.token).toBeTruthy();

    const appt = await Appointment.findOne({ code: r.body.code });
    expect(String(appt!.barber)).toBe(String(ctx.lucas._id));
    expect(String(appt!.service)).toBe(String(ctx.fade._id));
    expect(appt!.notes).toContain("Máquina 2 a los costados");
    expect(appt!.status).toBe("pending_payment"); // la sede pide seña, igual que en la reserva normal
  });

  it("no deja repetir en un horario ocupado o sin sesión de cliente", async () => {
    const taken = await Appointment.findOne({ status: "pending_payment" });
    const day = taken!.startsAt.toISOString().slice(0, 10);
    const busy = await request(app).post("/api/v1/me/client/repeat-last-cut").set(me).send({ date: day, time: "00:00" });
    expect(busy.status).toBe(409);
    expect((await request(app).post("/api/v1/me/client/repeat-last-cut").send({ date, time: "12:00" })).status).toBe(401);
  });
});
