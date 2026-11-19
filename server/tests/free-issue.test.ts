import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { AuditLog } from "../src/modules/audit/audit.model.js";
import { MembershipPlan, PackPlan } from "../src/modules/commercial/commercial.models.js";
import { Client } from "../src/modules/clients/client.model.js";
import { User } from "../src/modules/users/user.model.js";
import { app, seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
let cashier: { Authorization: string };
let clientId: string;
let packPlan: string;
let memPlan: string;

beforeBeforeAll();
function beforeBeforeAll() {
  beforeAll(async () => {
    ctx = await seedBase();
    await User.create({ name: "Caja", email: "caja@jack.test", passwordHash: await bcrypt.hash("clave-larga-12345", 4), role: "reception" }); // tiene cash.manage, no commercial.manage
    const l = await request(app).post("/api/v1/auth/login").send({ email: "caja@jack.test", password: "clave-larga-12345" });
    cashier = { Authorization: `Bearer ${l.body.accessToken}` };
    clientId = String((await Client.create({ name: "Cli", phone: "5491155559090" }))._id);
    packPlan = String((await PackPlan.create({ name: "Pack", price: 5000, items: [{ category: "corte", label: "Corte", quantity: 2 }] }))._id);
    memPlan = String((await MembershipPlan.create({ name: "Club", price: 8000, items: [{ category: "corte", label: "Corte", quantity: 2 }] }))._id);
    await request(app).post("/api/v1/admin/cash/open").set(ctx.auth).send({ location: String(ctx.location._id), openingAmount: 0 });
  });
}

describe("emitir sin cobrar (media 8 de la revisión)", () => {
  it("quien solo tiene permiso de caja no puede regalar gift cards, packs ni membresías; con cobro sí", async () => {
    const loc = String(ctx.location._id);
    expect((await request(app).post("/api/v1/admin/commercial/giftcards").set(cashier).send({ value: 50000 })).status).toBe(403);
    expect((await request(app).post("/api/v1/admin/commercial/giftcards").set(cashier).send({ value: 5000, sale: { method: "cash", location: loc } })).status).toBe(201);
    expect((await request(app).post("/api/v1/admin/commercial/packs").set(cashier).send({ plan: packPlan, client: clientId })).status).toBe(403);
    expect((await request(app).post("/api/v1/admin/commercial/packs").set(cashier).send({ plan: packPlan, client: clientId, sale: { method: "cash", location: loc } })).status).toBe(201);
    expect((await request(app).post("/api/v1/admin/commercial/memberships").set(cashier).send({ plan: memPlan, client: clientId })).status).toBe(403);
    expect((await request(app).post("/api/v1/admin/commercial/memberships").set(cashier).send({ plan: memPlan, client: clientId, payment: { method: "cash", location: loc } })).status).toBe(201);
  });

  it("quien tiene permiso comercial puede emitir sin cobro, con tope de $100.000 y auditoría", async () => {
    const ok = await request(app).post("/api/v1/admin/commercial/giftcards").set(ctx.auth).send({ value: 20000, recipientName: "Regalo" });
    expect(ok.status).toBe(201);
    expect(await AuditLog.countDocuments({ summary: /sin cobro/ })).toBeGreaterThanOrEqual(1);
    const big = await request(app).post("/api/v1/admin/commercial/giftcards").set(ctx.auth).send({ value: 100001 });
    expect(big.status).toBe(400);
    expect((await request(app).post("/api/v1/admin/commercial/giftcards").set(ctx.auth).send({ value: 200000, sale: { method: "transfer", location: String(ctx.location._id) } })).status).toBe(201); // con cobro no hay tope
  });

  it("la búsqueda de gift cards no interpreta expresiones regulares", async () => {
    const r = await request(app).get("/api/v1/admin/commercial/giftcards").query({ search: "G.T-" }).set(ctx.auth);
    expect(r.status).toBe(200);
    expect(r.body.items).toHaveLength(0); // si se interpretara como regex, G.T- calzaría con GFT-
  });
});
