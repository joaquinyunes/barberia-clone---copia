import { createHmac } from "node:crypto";
import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Mercado Pago: respuestas dictadas por cada test, sin red.
const mp = vi.hoisted(() => ({ payments: new Map<string, Record<string, unknown>>(), subs: new Map<string, Record<string, unknown>>() }));
vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class {},
  Payment: class {
    get = async ({ id }: { id: string }) => {
      const p = mp.payments.get(String(id));
      if (!p) throw new Error("pago inexistente");
      return p;
    };
  },
  Preference: class {
    create = async () => ({ init_point: "https://sandbox.mercadopago.test/checkout", id: "pref-1" });
  },
  PreApproval: class {
    create = async () => ({ init_point: "https://sandbox.mercadopago.test/suscripcion", id: "sub-1" });
    get = async ({ id }: { id: string }) => {
      const s = mp.subs.get(String(id));
      if (!s) throw new Error("suscripción inexistente");
      return s;
    };
  },
}));

import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { Client } from "../src/modules/clients/client.model.js";
import { GiftCard, Membership, MembershipPlan } from "../src/modules/commercial/commercial.models.js";
import { Movement } from "../src/modules/ledger/ledger.model.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(3, 2);
let n = 0;

const sign = (dataId: string) => {
  const ts = String(Date.now());
  return { "x-signature": `ts=${ts},v1=${createHmac("sha256", process.env.MP_WEBHOOK_SECRET!).update(`id:${dataId.toLowerCase()};request-id:r;ts:${ts};`).digest("hex")}`, "x-request-id": "r" };
};
const webhook = (type: string, dataId: string) => request(app).post("/api/v1/public/mercadopago/webhook").query({ type, "data.id": dataId }).set(sign(dataId)).send({});

/** Reserva con seña, la aprueba y la finaliza cobrando el resto en efectivo. */
async function completed(opts: { consent?: boolean } = {}) {
  n += 1;
  const b = await request(app)
    .post("/api/v1/public/bookings")
    .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date, time: `${String(8 + n).padStart(2, "0")}:00`, customer: { name: `Cliente Número${n} Apellido`, phone: `11 7100-${2000 + n}` }, marketingConsent: opts.consent });
  expect(b.status).toBe(201);
  const appt = await Appointment.findOne({ code: b.body.code });
  expect((await request(app).post(`/api/v1/admin/appointments/${appt!._id}/approve-deposit`).set(ctx.auth).send({})).status).toBe(200);
  const done = await request(app).post(`/api/v1/admin/appointments/${appt!._id}/complete`).set(ctx.auth).send({ payments: [{ tender: "cash", amount: 10000 }] });
  expect(done.status).toBe(200);
  return { code: b.body.code as string, token: b.body.token as string, id: String(appt!._id), clientId: String(appt!.client) };
}
const pending = async () => {
  n += 1;
  const b = await request(app).post("/api/v1/public/bookings").send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date, time: `${String(8 + n).padStart(2, "0")}:00`, customer: { name: "Pendiente", phone: `11 7100-${2000 + n}` } });
  return b.body as { code: string; token: string };
};

beforeAll(async () => {
  ctx = await seedBase();
  await request(app).post("/api/v1/admin/cash/open").set(ctx.auth).send({ location: String(ctx.location._id), openingAmount: 0 });
});
beforeEach(() => {
  mp.payments.clear();
  mp.subs.clear();
});

describe("B6: reseñas verificadas y encuesta", () => {
  it("solo con turno realizado, con el link correcto y una sola vez; el público ve el primer nombre", async () => {
    const p = await pending();
    const early = await request(app).post(`/api/v1/public/bookings/${p.code}/review`).query({ token: p.token }).send({ rating: 5 });
    expect(early.status).toBe(409);

    const c = await completed();
    const other = await pending();
    expect((await request(app).post(`/api/v1/public/bookings/${c.code}/review`).query({ token: other.token }).send({ rating: 5 })).status).toBe(401);
    expect((await request(app).post(`/api/v1/public/bookings/${c.code}/review`).query({ token: c.token }).send({ rating: 7 })).status).toBe(400);
    const ok = await request(app).post(`/api/v1/public/bookings/${c.code}/review`).query({ token: c.token }).send({ rating: 5, recommend: 10, comment: "Excelente corte" });
    expect(ok.status).toBe(201);
    expect((await request(app).post(`/api/v1/public/bookings/${c.code}/review`).query({ token: c.token }).send({ rating: 1 })).status).toBe(409);

    const list = await request(app).get("/api/v1/public/reviews");
    expect(list.body.summary).toMatchObject({ count: 1, average: 5, nps: 100 });
    expect(list.body.items[0]).toMatchObject({ client: "Cliente", comment: "Excelente corte" });
    expect(JSON.stringify(list.body)).not.toMatch(/7100|Apellido/);

    const admin = await request(app).get("/api/v1/admin/engagement/reviews").set(ctx.auth);
    const id = admin.body.items[0]._id;
    expect((await request(app).patch(`/api/v1/admin/engagement/reviews/${id}`).set(ctx.auth).send({ status: "hidden" })).status).toBe(200);
    expect((await request(app).get("/api/v1/public/reviews")).body.items).toHaveLength(0);
  });
});

describe("B6: campañas solo con consentimiento", () => {
  it("sin tilde no hay consentimiento ni link de campaña; con tilde sí; la baja por link lo retira", async () => {
    const no = await completed();
    const si = await completed({ consent: true });
    expect((await Client.findById(no.clientId))!.marketing?.whatsapp).toBeFalsy();
    expect((await Client.findById(si.clientId))!.marketing?.whatsapp).toBe(true);

    await Client.updateMany({ _id: { $in: [no.clientId, si.clientId] } }, { lastVisitAt: new Date(Date.now() - 60 * 86_400_000) });
    const lapsed = await request(app).get("/api/v1/admin/engagement/lapsed?days=45").set(ctx.auth);
    expect(lapsed.status).toBe(200);
    const byId = Object.fromEntries(lapsed.body.items.map((i: { _id: string }) => [i._id, i]));
    expect(byId[no.clientId].whatsapp).toBeNull();
    expect(byId[si.clientId].whatsapp).toMatch(/^https:\/\/wa\.me\//);
    expect(byId[si.clientId].daysSince).toBeGreaterThanOrEqual(60);

    expect((await request(app).post(`/api/v1/public/bookings/${si.code}/unsubscribe`).query({ token: si.token })).status).toBe(204);
    expect((await Client.findById(si.clientId))!.marketing?.whatsapp).toBe(false);
  });
});

describe("B6: puntos canjeables", () => {
  it("se ganan por lo cobrado y se canjean una sola vez aunque lleguen dos pedidos a la vez", async () => {
    const c = await completed();
    const client = await Client.findById(c.clientId);
    expect(client!.points).toBe(150); // $15.000 cobrados × 10 puntos por $1.000
    const rs = await Promise.all([1, 2].map(() => request(app).post(`/api/v1/admin/engagement/clients/${c.clientId}/points/redeem`).set(ctx.auth).send({ points: 100 })));
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await Client.findById(c.clientId))!.points).toBe(50);
    const credit = await Movement.findOne({ concept: "Canje de 100 puntos" });
    expect(credit!.amount).toBe(100);
  });
});

describe("B6: QR de gift card", () => {
  it("lo genera solo el personal autorizado (no hay endpoint público que confirme si un código existe)", async () => {
    const gc = await GiftCard.create({ code: "GFT-TESTCODE01", initialValue: 10000, balance: 10000, status: "active" });
    const ok = await request(app)
      .get(`/api/v1/admin/commercial/giftcards/${gc._id}/qr.svg`)
      .set(ctx.auth)
      .buffer(true)
      .parse((res, cb) => {
        let d = "";
        res.on("data", (c: Buffer) => (d += c));
        res.on("end", () => cb(null, d));
      });
    expect(ok.status).toBe(200);
    expect(ok.headers["content-type"]).toContain("image/svg+xml");
    expect(String(ok.body)).toContain("<svg");
    expect((await request(app).get(`/api/v1/admin/commercial/giftcards/${gc._id}/qr.svg`)).status).toBe(401);
    expect((await request(app).get("/api/v1/public/giftcards/GFT-TESTCODE01/qr.svg")).status).toBe(404);
  });
});

describe("B6: propina online", () => {
  it("solo para turnos realizados; al aprobarse el pago se acredita al barbero una sola vez", async () => {
    const p = await pending();
    expect((await request(app).post(`/api/v1/public/bookings/${p.code}/tip`).query({ token: p.token }).send({ amount: 1000 })).status).toBe(409);
    const c = await completed();
    expect((await request(app).post(`/api/v1/public/bookings/${c.code}/tip`).query({ token: c.token }).send({ amount: 5 })).status).toBe(400);
    const pref = await request(app).post(`/api/v1/public/bookings/${c.code}/tip`).query({ token: c.token }).send({ amount: 2000 });
    expect(pref.status).toBe(200);
    expect(pref.body.initPoint).toContain("mercadopago");

    mp.payments.set("tip-1", { id: "tip-1", status: "approved", external_reference: `tip:${c.code}`, transaction_amount: 2000 });
    const rs = await Promise.all([webhook("payment", "tip-1"), webhook("payment", "tip-1")]);
    expect(rs.map((r) => r.status)).toEqual([200, 200]);
    const a = await Appointment.findById(c.id);
    expect(a!.tip).toBe(2000);
    expect(await Movement.countDocuments({ concept: `Propina online ${c.code}` })).toBe(1);
  });
});

describe("B7: cobro recurrente de la membresía", () => {
  let clientId: string;
  let planId: string;
  let userAuth: { Authorization: string };

  beforeAll(async () => {
    const plan = await MembershipPlan.create({ name: "Club Mensual", price: 20000, items: [{ category: "corte", label: "Cortes", quantity: 2 }] });
    planId = String(plan._id);
    const reg = await request(app).post("/api/v1/auth/register").send({ name: "Socio Club", email: "socio@mail.com", phone: "11 7200-0001", password: "12345678" });
    expect(reg.status).toBe(201);
    userAuth = { Authorization: `Bearer ${reg.body.accessToken}` };
    clientId = String((await Client.findOne({ email: "socio@mail.com" }))!._id);
    await bcrypt.hash("x", 1);
  });

  it("el cliente inicia la suscripción; la autorización crea la membresía una sola vez; los cobros la renuevan; la baja la cancela", async () => {
    const co = await request(app).post("/api/v1/me/client/membership/checkout").set(userAuth).send({ plan: planId });
    expect(co.status).toBe(200);
    expect(co.body.initPoint).toContain("suscripcion");

    mp.subs.set("sub-1", { id: "sub-1", status: "authorized", external_reference: `membership:${clientId}:${planId}` });
    const first = await webhook("subscription_preapproval", "sub-1");
    expect(first.body.handled).toBe(true);
    const again = await webhook("subscription_preapproval", "sub-1");
    expect(again.body.duplicate).toBe(true);
    expect(await Membership.countDocuments({ client: clientId })).toBe(1);
    const m1 = await Membership.findOne({ client: clientId });
    expect(m1!.mpPreapprovalId).toBe("sub-1");

    // primer cobro: se registra sin extender; el segundo renueva 30 días
    mp.payments.set("pay-m1", { id: "pay-m1", status: "approved", external_reference: `membership:${clientId}:${planId}`, transaction_amount: 20000 });
    expect((await webhook("payment", "pay-m1")).body.handled).toBe(true);
    const afterFirst = await Membership.findOne({ client: clientId });
    expect(afterFirst!.payments).toHaveLength(1);
    expect(afterFirst!.renewsAt!.getTime()).toBe(m1!.renewsAt!.getTime());

    mp.payments.set("pay-m2", { id: "pay-m2", status: "approved", external_reference: `membership:${clientId}:${planId}`, transaction_amount: 20000 });
    expect((await webhook("payment", "pay-m2")).body.handled).toBe(true);
    const afterSecond = await Membership.findOne({ client: clientId });
    expect(afterSecond!.payments).toHaveLength(2);
    expect(afterSecond!.renewsAt!.getTime()).toBeGreaterThan(m1!.renewsAt!.getTime());

    mp.subs.set("sub-1", { id: "sub-1", status: "cancelled", external_reference: `membership:${clientId}:${planId}` });
    await webhook("subscription_preapproval", "sub-1");
    expect((await Membership.findOne({ client: clientId }))!.status).toBe("cancelled");
  });

  it("un cobro que llega ANTES que el aviso de la suscripción no se pierde: devuelve 409 y el reintento lo procesa", async () => {
    await Membership.deleteMany({ client: clientId });
    mp.payments.set("pay-early", { id: "pay-early", status: "approved", external_reference: `membership:${clientId}:${planId}`, transaction_amount: 20000 });
    mp.subs.set("sub-2", { id: "sub-2", status: "authorized", external_reference: `membership:${clientId}:${planId}` });
    expect((await webhook("payment", "pay-early")).status).toBe(409);
    await Promise.all([webhook("subscription_preapproval", "sub-2"), webhook("subscription_preapproval", "sub-2")]);
    expect(await Membership.countDocuments({ client: clientId })).toBe(1);
    expect((await webhook("payment", "pay-early")).body.handled).toBe(true);
    expect((await Membership.findOne({ client: clientId }))!.payments).toHaveLength(1);
  });

  it("no deja suscribirse dos veces ni con un plan inexistente", async () => {
    await Membership.updateOne({ client: clientId }, { status: "active" });
    expect((await request(app).post("/api/v1/me/client/membership/checkout").set(userAuth).send({ plan: planId })).status).toBe(409);
    expect((await request(app).post("/api/v1/me/client/membership/checkout").set(userAuth).send({ plan: "a".repeat(24) })).status).toBe(404);
  });
});
