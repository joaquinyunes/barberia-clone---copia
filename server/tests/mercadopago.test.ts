import { createHmac } from "node:crypto";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Mercado Pago "responde" lo que cada test dicta: nunca se llama a la red.
const mp = vi.hoisted(() => ({ payments: new Map<string, Record<string, unknown>>() }));
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
}));

import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { CashMovement } from "../src/modules/cash/cash.model.js";
import { PaymentEvent } from "../src/modules/payments/paymentEvent.model.js";
import { app, nextWeekday, seedBase } from "./fixtures.js";

const SECRET = process.env.MP_WEBHOOK_SECRET!;
const sign = (dataId: string, requestId = "req-1", ts = String(Date.now())) =>
  `ts=${ts},v1=${createHmac("sha256", SECRET).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest("hex")}`;
const webhook = (dataId: string, headers: Record<string, string> = { "x-signature": sign(dataId), "x-request-id": "req-1" }) =>
  request(app).post("/api/v1/public/mercadopago/webhook").query({ type: "payment", "data.id": dataId }).set(headers).send({});

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(1, 2);
let n = 0;
async function newBooking() {
  n += 1;
  const r = await request(app)
    .post("/api/v1/public/bookings")
    .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date, time: `${String(9 + n).padStart(2, "0")}:00`, customer: { name: `MP ${n}`, phone: `11 9000-${1000 + n}` } });
  expect(r.status).toBe(201);
  return r.body as { code: string; token: string; deposit: number };
}
const approved = (id: string, code: string, amount: number, status = "approved") => mp.payments.set(id, { id, status, external_reference: `appointment:${code}`, transaction_amount: amount });

beforeAll(async () => {
  expect(process.env.MP_WEBHOOK_SECRET).toBeTruthy();
  ctx = await seedBase();
});
beforeEach(() => mp.payments.clear());

describe("Mercado Pago: preferencia", () => {
  it("crea la preferencia de la seña con un link válido y no cobra turnos ya confirmados", async () => {
    const b = await newBooking();
    const r = await request(app).post("/api/v1/public/mercadopago/preference").send({ kind: "appointment", code: b.code, token: b.token });
    expect(r.status).toBe(200);
    expect(r.body.initPoint).toContain("mercadopago");
    approved("pay-pref", b.code, b.deposit);
    expect((await webhook("pay-pref")).status).toBe(200);
    const again = await request(app).post("/api/v1/public/mercadopago/preference").send({ kind: "appointment", code: b.code, token: b.token });
    expect(again.status).toBe(409);
  });

  it("rechaza un token de otra reserva", async () => {
    const a = await newBooking();
    const b = await newBooking();
    const r = await request(app).post("/api/v1/public/mercadopago/preference").send({ kind: "appointment", code: a.code, token: b.token });
    expect(r.status).toBe(401);
  });
});

describe("Mercado Pago: webhook (S6)", () => {
  it("sin firma o con firma inválida → 401 y el turno no se confirma", async () => {
    const b = await newBooking();
    approved("pay-1", b.code, b.deposit);
    expect((await webhook("pay-1", {})).status).toBe(401);
    expect((await webhook("pay-1", { "x-signature": "ts=1,v1=deadbeef", "x-request-id": "req-1" })).status).toBe(401);
    // firma válida pero de OTRO id de pago
    expect((await webhook("pay-1", { "x-signature": sign("otro-id"), "x-request-id": "req-1" })).status).toBe(401);
    expect((await Appointment.findOne({ code: b.code }))!.status).toBe("pending_payment");
  });

  it("firma válida + pago aprobado → turno confirmado, seña y caja registradas", async () => {
    const b = await newBooking();
    approved("pay-2", b.code, b.deposit);
    const r = await webhook("pay-2");
    expect(r.status).toBe(200);
    expect(r.body.handled).toBe(true);
    const a = await Appointment.findOne({ code: b.code });
    expect(a!.status).toBe("confirmed");
    expect(a!.deposit.mpPaymentId).toBe("pay-2");
    expect(a!.deposit.paid).toBe(b.deposit);
    expect(await CashMovement.countDocuments({ concept: `Seña ${b.code}` })).toBe(1);
  });

  it("el mismo evento repetido y simultáneo suma la seña UNA sola vez", async () => {
    const b = await newBooking();
    approved("pay-3", b.code, b.deposit);
    const rs = await Promise.all(Array.from({ length: 6 }, () => webhook("pay-3")));
    expect(rs.every((r) => r.status === 200)).toBe(true);
    expect(rs.filter((r) => r.body.handled === true)).toHaveLength(1);
    expect(await CashMovement.countDocuments({ concept: `Seña ${b.code}` })).toBe(1);
    expect(await PaymentEvent.countDocuments({ paymentId: "pay-3" })).toBe(1);
    const later = await webhook("pay-3");
    expect(later.body.duplicate).toBe(true);
    expect(await CashMovement.countDocuments({ concept: `Seña ${b.code}` })).toBe(1);
  });

  it("un pago rechazado o pendiente no confirma", async () => {
    const b = await newBooking();
    approved("pay-4", b.code, b.deposit, "rejected");
    expect((await webhook("pay-4")).body.handled).toBe(false);
    expect((await Appointment.findOne({ code: b.code }))!.status).toBe("pending_payment");
  });

  it("un monto menor a la seña no confirma y queda para revisión", async () => {
    const b = await newBooking();
    approved("pay-5", b.code, b.deposit - 1);
    expect((await webhook("pay-5")).body.outcome).toBe("needs_review");
    expect((await Appointment.findOne({ code: b.code }))!.status).toBe("pending_payment");
  });

  it("un pago aprobado de un turno ya cancelado no mueve la caja y queda marcado para reembolso", async () => {
    const b = await newBooking();
    await Appointment.updateOne({ code: b.code }, { status: "cancelled" });
    approved("pay-6", b.code, b.deposit);
    const r = await webhook("pay-6");
    expect(r.body.outcome).toBe("needs_review");
    expect(await CashMovement.countDocuments({ concept: `Seña ${b.code}` })).toBe(0);
  });

  it("si la consulta a Mercado Pago falla no se pierde el pago: el reintento lo procesa", async () => {
    const b = await newBooking();
    const first = await webhook("pay-7"); // todavía no existe en la "API"
    expect(first.status).toBe(500);
    approved("pay-7", b.code, b.deposit);
    expect((await webhook("pay-7")).body.handled).toBe(true);
  });

  it("avisos que no son de pago se ignoran sin consultar nada", async () => {
    const r = await request(app).post("/api/v1/public/mercadopago/webhook").query({ type: "merchant_order", "data.id": "123" }).send({});
    expect(r.status).toBe(200);
    expect(r.body.ignored).toBe(true);
  });
});
