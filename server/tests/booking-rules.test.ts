import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { Location } from "../src/modules/locations/location.model.js";
import { Service } from "../src/modules/services/service.model.js";
import { app, nextWeekday, seedBase, tinyPng } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(4, 2);
const book = (time: string, phone: string, service = String(ctx.fade._id)) =>
  request(app)
    .post("/api/v1/public/bookings")
    .send({ location: String(ctx.location._id), service, barber: String(ctx.lucas._id), date, time, customer: { name: "Cliente", phone } });

beforeAll(async () => {
  ctx = await seedBase();
});

describe("reglas de reserva", () => {
  it("no permite reservar un servicio exclusivo de otra sede", async () => {
    const otra = await Location.create({ slug: "vip", name: "VIP", address: "Alvear 1", whatsapp: "5491155550001", openingHours: [] });
    const vip = await Service.create({ slug: "ritual", name: "Ritual", category: "vip", durationMin: 60, price: 30000, locations: [otra._id] });
    const av = await request(app).get("/api/v1/public/availability").query({ location: String(ctx.location._id), service: String(vip._id), date });
    expect(av.status).toBe(400);
    const r = await book("12:00", "11 7000-0001", String(vip._id));
    expect(r.status).toBe(400);
  });

  it("un turno vencido no se reactiva si otro se le superpone aunque empiece a otra hora", async () => {
    const first = await book("10:00", "11 7000-0002"); // Fade 45 min: 10:00–10:45
    expect(first.status).toBe(201);
    // La reserva vence sin seña: el sistema la cancela y libera el horario.
    await Appointment.updateOne({ code: first.body.code }, { status: "cancelled", cancellation: { by: "system", at: new Date(), reason: "Venció la reserva" } });
    const second = await book("10:30", "11 7000-0003");
    expect(second.status).toBe(201);

    const late = await request(app).post(`/api/v1/public/bookings/${first.body.code}/receipt`).query({ token: first.body.token }).attach("receipt", tinyPng, "comprobante.png");
    expect(late.status).toBe(409);
  });

  it("el .ics escapa las comas de la dirección", async () => {
    await Location.updateOne({ _id: ctx.location._id }, { address: "Honduras 4820, Palermo" });
    const b = await book("16:00", "11 7000-0004");
    const r = await request(app).get(`/api/v1/public/bookings/${b.body.code}/calendar.ics`).query({ token: b.body.token });
    expect(r.status).toBe(200);
    expect(r.text).toContain("LOCATION:Centro – Honduras 4820\\, Palermo");
  });
});
