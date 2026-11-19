import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { CashMovement } from "../src/modules/cash/cash.model.js";
import { GiftCard, Membership, MembershipPlan, ClientPack, PackPlan } from "../src/modules/commercial/commercial.models.js";
import { Movement } from "../src/modules/ledger/ledger.model.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(1, 4);
const date2 = nextWeekday(2, 4); // para los segundos turnos del mismo cliente
let n = 0;

/** Turno confirmado (seña aprobada) listo para finalizar. */
async function confirmed(phone: string) {
  n += 1;
  const b = await request(app)
    .post("/api/v1/public/bookings")
    .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date, time: `${String(9 + (n % 11)).padStart(2, "0")}:${n > 10 ? "30" : "00"}`, customer: { name: `Cliente ${n}`, phone } });
  expect(b.status).toBe(201);
  const a = await Appointment.findOne({ code: b.body.code });
  expect((await request(app).post(`/api/v1/admin/appointments/${a!._id}/approve-deposit`).set(ctx.auth).send({})).status).toBe(200);
  return { id: String(a!._id), client: String(a!.client), code: b.body.code as string };
}
const complete = (id: string, payments: unknown[]) => request(app).post(`/api/v1/admin/appointments/${id}/complete`).set(ctx.auth).send({ payments });

beforeAll(async () => {
  ctx = await seedBase();
  await request(app).post("/api/v1/admin/cash/open").set(ctx.auth).send({ location: String(ctx.location._id), openingAmount: 0 });
});

describe("finalizar un turno es atómico (alta de la revisión)", () => {
  it("dos «Finalizar» simultáneos del mismo turno: uno solo cobra, una sola comisión", async () => {
    const t = await confirmed("11 4200-0001");
    const rs = await Promise.all([complete(t.id, [{ tender: "cash", amount: 10000 }]), complete(t.id, [{ tender: "cash", amount: 10000 }])]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await CashMovement.countDocuments({ concept: `Fade ${t.code}` })).toBe(1);
    expect(await Movement.countDocuments({ type: "commission", "ref.id": t.id })).toBe(1);
    expect((await Appointment.findById(t.id))!.status).toBe("completed");
    // si falla la validación, el turno queda abierto para reintentar (no queda «trabado»)
    const t2 = await confirmed("11 4200-0002");
    const bad = await complete(t2.id, [{ tender: "giftcard", giftCardCode: "NOEXISTE", amount: 100 }]);
    expect(bad.status).toBe(400);
    expect((await complete(t2.id, [{ tender: "cash", amount: 10000 }])).status).toBe(200);
  });

  it("una gift card con $10.000 usada en dos turnos a la vez nunca gasta más de $10.000", async () => {
    const gc = await GiftCard.create({ code: "GFT-ATOMICO001", initialValue: 10000, balance: 10000, status: "active" });
    const a = await confirmed("11 4200-0003");
    const b = await confirmed("11 4200-0004");
    const pay = (id: string) => complete(id, [{ tender: "giftcard", giftCardCode: gc.code, amount: 10000 }, { tender: "cash", amount: 10000 }]);
    const rs = await Promise.all([pay(a.id), pay(b.id)]);
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1); // el que llega segundo se encuentra la tarjeta ya gastada
    const loser = rs.findIndex((r) => r.status !== 200) === 0 ? a : b;
    expect(rs.find((r) => r.status !== 200)!.status).toBeLessThan(500);
    // y el que falló no dejó nada a medio hacer: sin cargo, sin caja, sin comisión, turno abierto para reintentar con otro medio de pago
    expect(await Movement.countDocuments({ "ref.id": loser.id, type: { $in: ["service_charge", "commission", "credit"] } })).toBe(0);
    expect(await CashMovement.countDocuments({ concept: `Fade ${loser.code}` })).toBe(0);
    expect((await Appointment.findById(loser.id))!.status).toBe("confirmed");
    expect((await complete(loser.id, [{ tender: "cash", amount: 10000 }])).status).toBe(200);
    const after = await GiftCard.findById(gc._id);
    expect(after!.balance).toBe(0);
    expect(after!.status).toBe("used");
    expect(after!.redemptions.reduce((s, r) => s + (r.amount ?? 0), 0)).toBe(10000);
  });

  it("una membresía con un solo cupo no alcanza para dos turnos simultáneos", async () => {
    const plan = await MembershipPlan.create({ name: "Un corte", price: 1000, items: [{ category: "corte", label: "Corte", quantity: 1 }] });
    const a = await confirmed("11 4200-0005");
    const b = await Appointment.findOne({ client: a.client });
    expect(b).toBeTruthy();
    // dos turnos del mismo cliente
    n += 1;
    const second = await request(app)
      .post("/api/v1/public/bookings")
      .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date: date2, time: "10:00", customer: { name: "Mismo", phone: "11 4200-0005" } });
    const secondAppt = await Appointment.findOne({ code: second.body.code });
    await request(app).post(`/api/v1/admin/appointments/${secondAppt!._id}/approve-deposit`).set(ctx.auth).send({});
    await Membership.create({ client: a.client, plan: plan._id, status: "active", renewsAt: new Date(Date.now() + 20 * 86_400_000), usage: [{ key: "category:corte", label: "Corte", total: 1, used: 0 }] });
    const rs = await Promise.all([complete(a.id, [{ tender: "membership", amount: 0 }]), complete(String(secondAppt!._id), [{ tender: "membership", amount: 0 }])]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 400]);
    expect((await Membership.findOne({ client: a.client }))!.usage[0].used).toBe(1);
  });

  it("un pack con un solo cupo tampoco se usa dos veces", async () => {
    const plan = await PackPlan.create({ name: "Pack 1", price: 1000, items: [{ category: "corte", label: "Corte", quantity: 1 }] });
    const a = await confirmed("11 4200-0006");
    const second = await request(app)
      .post("/api/v1/public/bookings")
      .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date: date2, time: "12:00", customer: { name: "Mismo", phone: "11 4200-0006" } });
    const secondAppt = await Appointment.findOne({ code: second.body.code });
    await request(app).post(`/api/v1/admin/appointments/${secondAppt!._id}/approve-deposit`).set(ctx.auth).send({});
    await ClientPack.create({ code: "BONO-AT001", client: a.client, plan: plan._id, name: "Pack 1", status: "active", expiresAt: new Date(Date.now() + 20 * 86_400_000), usage: [{ key: "category:corte", label: "Corte", total: 1, used: 0 }] });
    const rs = await Promise.all([complete(a.id, [{ tender: "pack", amount: 0 }]), complete(String(secondAppt!._id), [{ tender: "pack", amount: 0 }])]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 400]);
    const p = await ClientPack.findOne({ code: "BONO-AT001" });
    expect(p!.usage[0].used).toBe(1);
    expect(p!.status).toBe("used");
  });
});
