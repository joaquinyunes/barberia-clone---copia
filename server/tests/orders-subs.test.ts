import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mp = vi.hoisted(() => ({ creates: 0, updates: [] as { id: string; body: Record<string, unknown> }[], subs: new Map<string, Record<string, unknown>>() }));
vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class {},
  Payment: class {},
  Preference: class {},
  PreApproval: class {
    create = async () => {
      mp.creates += 1;
      await new Promise((r) => setTimeout(r, 30)); // la API tarda: da tiempo a un segundo clic
      return { init_point: `https://sandbox.mercadopago.test/sus-${mp.creates}`, id: `sub-${mp.creates}` };
    };
    update = async (p: { id: string; body: Record<string, unknown> }) => void mp.updates.push(p);
    get = async ({ id }: { id: string }) => mp.subs.get(String(id));
  },
}));

import { createHmac } from "node:crypto";
import { CashMovement } from "../src/modules/cash/cash.model.js";
import { GiftCard, Membership, MembershipPlan } from "../src/modules/commercial/commercial.models.js";
import { Product } from "../src/modules/inventory/inventory.models.js";
import { Order } from "../src/modules/orders/order.model.js";
import { Client } from "../src/modules/clients/client.model.js";
import { app, registerLinked, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
beforeAll(async () => {
  ctx = await seedBase();
  await request(app).post("/api/v1/admin/cash/open").set(ctx.auth).send({ location: String(ctx.location._id), openingAmount: 0 });
});
beforeEach(() => {
  mp.creates = 0;
  mp.updates.length = 0;
  mp.subs.clear();
});

describe("aprobar un pedido es atómico (media 12 de la revisión)", () => {
  it("dos aprobaciones a la vez emiten UNA sola gift card y una sola entrada de caja", async () => {
    const product = await Product.create({ name: "Gift $10.000", slug: "gift-10", kind: "giftcard", price: 10000, giftValue: 10000, shop: true, active: true });
    const o = await request(app)
      .post("/api/v1/public/orders")
      .send({ items: [{ kind: "product", id: String(product._id), qty: 1 }], customer: { name: "Comprador", phone: "11 4500-0001" }, location: String(ctx.location._id) });
    expect(o.status).toBe(201);
    const order = await Order.findOne({ code: o.body.code });
    const approve = () => request(app).post(`/api/v1/admin/orders/${order!._id}/approve`).set(ctx.auth).send({ method: "transfer" });
    const rs = await Promise.all([approve(), approve(), approve()]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409, 409]);
    expect(await GiftCard.countDocuments({ order: order!._id })).toBe(1);
    expect(await CashMovement.countDocuments({ concept: new RegExp(o.body.code) })).toBe(1);
    expect((await Order.findById(order!._id))!.status).toBe("paid");
  });

  it("si la aprobación falla a mitad, el pedido vuelve a quedar pendiente (se puede reintentar)", async () => {
    const product = await Product.create({ name: "Sin stock", slug: "sin-stock", kind: "sale", price: 3000, stock: 5, shop: true, active: true });
    const o = await request(app)
      .post("/api/v1/public/orders")
      .send({ items: [{ kind: "product", id: String(product._id), qty: 2 }], customer: { name: "Comprador", phone: "11 4500-0002" }, location: String(ctx.location._id) });
    await Product.updateOne({ _id: product._id }, { stock: 0 }); // se vendió por otro lado antes de aprobar
    const order = await Order.findOne({ code: o.body.code });
    const bad = await request(app).post(`/api/v1/admin/orders/${order!._id}/approve`).set(ctx.auth).send({ method: "cash" });
    expect(bad.status).toBeGreaterThanOrEqual(400);
    expect((await Order.findById(order!._id))!.status).toBe("pending_payment");
    await Product.updateOne({ _id: product._id }, { stock: 10 });
    expect((await request(app).post(`/api/v1/admin/orders/${order!._id}/approve`).set(ctx.auth).send({ method: "cash" })).status).toBe(200);
  });
});

describe("la suscripción no se duplica por doble clic (media 11 de la revisión)", () => {
  it("dos pedidos de checkout a la vez crean UNA suscripción en Mercado Pago y devuelven el mismo link", async () => {
    const plan = await MembershipPlan.create({ name: "Club", price: 20000, items: [{ category: "corte", label: "Corte", quantity: 2 }] });
    const { auth } = await registerLinked("Doble Clic", "doble@mail.com", "11 7400-0001", "12345678");
    const go = () => request(app).post("/api/v1/me/client/membership/checkout").set(auth).send({ plan: String(plan._id) });
    const rs = await Promise.all([go(), go(), go()]);
    expect(mp.creates).toBe(1);
    const ok = rs.filter((r) => r.status === 200);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    expect(new Set(ok.map((r) => r.body.initPoint)).size).toBe(1);
    expect(rs.filter((r) => r.status !== 200).every((r) => r.status === 409)).toBe(true);
    // un clic más tarde (misma intención vigente): mismo link, sin crear otra suscripción
    const later = await go();
    expect(later.status).toBe(200);
    expect(later.body.initPoint).toBe(ok[0].body.initPoint);
    expect(mp.creates).toBe(1);
  });

  it("si igual se autorizan dos suscripciones del mismo cliente, la segunda se cancela en Mercado Pago (no se cobra doble)", async () => {
    const plan = await MembershipPlan.findOne({ name: "Club" });
    const c = await Client.findOne({ email: "doble@mail.com" });
    const sign = (id: string) => {
      const ts = String(Date.now());
      return { "x-signature": `ts=${ts},v1=${createHmac("sha256", process.env.MP_WEBHOOK_SECRET!).update(`id:${id};request-id:r;ts:${ts};`).digest("hex")}`, "x-request-id": "r" };
    };
    const hook = (id: string) => request(app).post("/api/v1/public/mercadopago/webhook").query({ type: "subscription_preapproval", "data.id": id }).set(sign(id)).send({});
    mp.subs.set("sub-a", { id: "sub-a", status: "authorized", external_reference: `membership:${c!._id}:${plan!._id}` });
    mp.subs.set("sub-b", { id: "sub-b", status: "authorized", external_reference: `membership:${c!._id}:${plan!._id}` });
    expect((await hook("sub-a")).body.handled).toBe(true);
    const b = await hook("sub-b");
    expect(b.status).toBe(200);
    expect(mp.updates).toEqual([{ id: "sub-b", body: { status: "cancelled" } }]);
    expect(await Membership.countDocuments({ client: c!._id, status: "active" })).toBe(1);
  });
});
