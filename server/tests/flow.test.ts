import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app, nextWeekday, seedBase, tinyPng } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
const date = nextWeekday(2, 2); // un martes, al menos 2 días adelante

beforeAll(async () => {
  ctx = await seedBase();
});

describe("Flujo completo: reserva web → WhatsApp → caja → comisión → liquidación", () => {
  let booking: { code: string; token: string; deposit: number; total: number };
  let appointmentId: string;

  it("muestra horarios disponibles", async () => {
    const r = await request(app).get("/api/v1/public/availability").query({ location: String(ctx.location._id), service: String(ctx.fade._id), date });
    expect(r.status).toBe(200);
    expect(r.body.slots).toContain("10:00");
    expect(r.body.barbers[0].barber.name).toBe("Lucas");
  });

  it("reserva como invitado con 'cualquier barbero' y queda esperando la seña", async () => {
    const r = await request(app)
      .post("/api/v1/public/bookings")
      .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: "any", date, time: "10:00", customer: { name: "Juan Pérez", phone: "11 5555-1234", email: "juan@mail.com" }, notes: "Degradé bajo" });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe("pending_payment");
    expect(r.body.deposit).toBe(5000);
    expect(r.body.bank.alias).toBe("JACK.EL.BARBERO");
    expect(r.body.referralCode).toMatch(/^JUAN\d{2}$/);
    booking = r.body;
  });

  it("el mismo horario ya no está disponible (anti doble reserva)", async () => {
    const r = await request(app)
      .post("/api/v1/public/bookings")
      .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date, time: "10:00", customer: { name: "Otro", phone: "1144443333" } });
    expect(r.status).toBe(409);
    const av = await request(app).get("/api/v1/public/availability").query({ location: String(ctx.location._id), service: String(ctx.fade._id), date });
    expect(av.body.slots).not.toContain("10:00");
    expect(av.body.slots).not.toContain("10:30"); // se superpone con el Fade de 45 min
    expect(av.body.slots).toContain("10:45");
  });

  it("rechaza el comprobante sin token o con un archivo que no es imagen/PDF", async () => {
    const noToken = await request(app).post(`/api/v1/public/bookings/${booking.code}/receipt`).attach("receipt", tinyPng, "comprobante.png");
    expect(noToken.status).toBe(401);
    const exe = await request(app)
      .post(`/api/v1/public/bookings/${booking.code}/receipt`)
      .query({ token: booking.token })
      .attach("receipt", Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00fake"), "comprobante.jpg");
    expect(exe.status).toBe(400);
  });

  it("sube el comprobante y genera el mensaje de WhatsApp con todos los datos", async () => {
    const up = await request(app).post(`/api/v1/public/bookings/${booking.code}/receipt`).query({ token: booking.token }).attach("receipt", tinyPng, "comprobante.png");
    expect(up.status).toBe(200);
    expect(up.body.status).toBe("payment_review");

    const wa = await request(app).get(`/api/v1/public/bookings/${booking.code}/whatsapp`).query({ token: booking.token });
    expect(wa.status).toBe(200);
    expect(wa.body.url).toMatch(/^https:\/\/wa\.me\/5491155550000\?text=/);
    for (const piece of [booking.code, "Juan Pérez", "Fade (45 min)", "Lucas", "Centro", "Comprobante", "Degradé bajo"]) expect(wa.body.text).toContain(piece);

    // el link firmado del comprobante devuelve la imagen
    const receiptPath = new URL(wa.body.receiptUrl).pathname + new URL(wa.body.receiptUrl).search;
    const img = await request(app).get(receiptPath);
    expect(img.status).toBe(200);
    expect(img.headers["content-type"]).toBe("image/png");
    const forged = await request(app).get(`/api/v1/public/receipts/${booking.code}?t=falso`);
    expect(forged.status).toBe(401);
  });

  it("el admin aprueba la seña: entra a caja y queda como saldo a favor del cliente", async () => {
    const list = await request(app).get("/api/v1/admin/appointments").set(ctx.auth).query({ code: booking.code });
    appointmentId = list.body.items[0]._id;
    const r = await request(app).post(`/api/v1/admin/appointments/${appointmentId}/approve-deposit`).set(ctx.auth).send({});
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("confirmed");
    expect(r.body.deposit.paid).toBe(5000);
  });

  it("no deja cobrar en efectivo con la caja cerrada; al abrirla sí", async () => {
    const closed = await request(app)
      .post(`/api/v1/admin/appointments/${appointmentId}/complete`)
      .set(ctx.auth)
      .send({ payments: [{ tender: "cash", amount: 10000 }] });
    expect(closed.status).toBe(409);
    expect(closed.body.error.message).toMatch(/caja/i);

    const open = await request(app).post("/api/v1/admin/cash/open").set(ctx.auth).send({ location: String(ctx.location._id), openingAmount: 50000 });
    expect(open.status).toBe(201);
  });

  it("finaliza el turno: cobra el resto, propina, comisión automática y saldo del cliente en 0", async () => {
    const r = await request(app)
      .post(`/api/v1/admin/appointments/${appointmentId}/complete`)
      .set(ctx.auth)
      .send({ payments: [{ tender: "cash", amount: 10000 }], tip: { amount: 1000, method: "cash" }, cutNote: "Máquina 1 a los costados" });
    expect(r.status).toBe(200);
    expect(r.body.commission).toBe(7000); // comisión propia del servicio Fade
    expect(r.body.clientBalance).toBe(0);
    expect(r.body.appointment.status).toBe("completed");

    const barber = await request(app).get(`/api/v1/admin/ledger/barber/${ctx.lucas._id}`).set(ctx.auth);
    expect(barber.body.balance).toBe(8000); // 7000 comisión + 1000 propina
  });

  it("la caja esperada suma apertura + seña (transferencia aparte) + cobro + propina", async () => {
    const r = await request(app).get("/api/v1/admin/cash/current").set(ctx.auth).query({ location: String(ctx.location._id) });
    expect(r.body.expected.cash).toBe(50000 + 10000 + 1000);
    // la seña se aprobó antes de abrir la caja: queda registrada sin sesión
  });

  it("adelanto con tope: no permite más del 80% del saldo salvo que se fuerce", async () => {
    const over = await request(app).post("/api/v1/admin/staff/advances").set(ctx.auth).send({ barber: String(ctx.lucas._id), amount: 7000, method: "cash" });
    expect(over.status).toBe(409);
    expect(over.body.error.code).toBe("ADVANCE_LIMIT");
    const ok = await request(app).post("/api/v1/admin/staff/advances").set(ctx.auth).send({ barber: String(ctx.lucas._id), amount: 3000, method: "cash", reason: "Adelanto semanal" });
    expect(ok.status).toBe(201);
    expect(ok.body.balanceBefore).toBe(8000);
    expect(ok.body.balanceAfter).toBe(5000);
  });

  it("deuda en cuotas: se descuenta la cuota vencida al liquidar", async () => {
    const debt = await request(app)
      .post("/api/v1/admin/staff/debts")
      .set(ctx.auth)
      .send({ barber: String(ctx.lucas._id), category: "tool", concept: "Compra máquina", total: 6000, installments: 3, firstDueDate: new Date(Date.now() - 86_400_000).toISOString() });
    expect(debt.status).toBe(201);
    expect(debt.body.installments.map((i: { amount: number }) => i.amount)).toEqual([2000, 2000, 2000]);

    const preview = await request(app).post("/api/v1/admin/staff/settlements/preview").set(ctx.auth).send({ barber: String(ctx.lucas._id), from: new Date(Date.now() - 30 * 86_400_000).toISOString(), to: new Date(Date.now() + 86_400_000).toISOString() });
    expect(preview.status).toBe(200);
    expect(preview.body.balance).toBe(5000);
    expect(preview.body.total).toBe(3000); // 5000 − cuota 1/3 de 2000
  });

  it("cierra la liquidación: paga, deja el saldo en 0 y guarda el período", async () => {
    const r = await request(app)
      .post("/api/v1/admin/staff/settlements")
      .set(ctx.auth)
      .send({ barber: String(ctx.lucas._id), from: new Date(Date.now() - 30 * 86_400_000).toISOString(), to: new Date(Date.now() + 86_400_000).toISOString(), label: "Prueba", method: "cash" });
    expect(r.status).toBe(201);
    expect(r.body.payout).toBe(3000);
    expect(r.body.status).toBe("paid");
    const barber = await request(app).get(`/api/v1/admin/ledger/barber/${ctx.lucas._id}`).set(ctx.auth);
    expect(barber.body.balance).toBe(0);
    const history = await request(app).get("/api/v1/admin/staff/settlements").set(ctx.auth).query({ barber: String(ctx.lucas._id) });
    expect(history.body.items).toHaveLength(1);
  });

  it("centro de saldos y dashboard responden con la información consolidada", async () => {
    const balances = await request(app).get("/api/v1/admin/reports/balances").set(ctx.auth);
    expect(balances.status).toBe(200);
    expect(balances.body.barbers.toPay).toBe(0);
    const dash = await request(app).get("/api/v1/admin/reports/dashboard").set(ctx.auth);
    expect(dash.status).toBe(200);
    expect(dash.body.completed).toBeGreaterThanOrEqual(1);
    const pnl = await request(app).get("/api/v1/admin/reports/pnl").set(ctx.auth);
    expect(pnl.body.income.services).toBe(15000);
    expect(pnl.body.costs.commissions).toBe(7000);
  });

  it("queda todo en la auditoría", async () => {
    const r = await request(app).get("/api/v1/admin/audit").set(ctx.auth);
    const summaries = r.body.items.map((i: { summary: string }) => i.summary).join("\n");
    expect(summaries).toMatch(/aprobó la seña/);
    expect(summaries).toMatch(/adelanto/);
    expect(summaries).toMatch(/cerró la liquidación/);
  });
});

describe("Cuenta corriente del cliente y cancelaciones", () => {
  it("cobro parcial genera deuda; supera el tope si no se autoriza", async () => {
    await request(app).patch("/api/v1/admin/settings").set(ctx.auth).send({ clientCreditLimit: 5000 });
    const book = await request(app)
      .post("/api/v1/admin/appointments")
      .set(ctx.auth)
      .send({ location: String(ctx.location._id), service: String(ctx.fade._id), barber: String(ctx.lucas._id), date, time: "15:00", customer: { name: "Mateo Deudor", phone: "1133332222" } });
    expect(book.status).toBe(201);
    const id = book.body._id;
    const tooMuch = await request(app).post(`/api/v1/admin/appointments/${id}/complete`).set(ctx.auth).send({ payments: [{ tender: "cash", amount: 5000 }] });
    expect(tooMuch.status).toBe(409);
    expect(tooMuch.body.error.code).toBe("CREDIT_LIMIT");
    // nada se registró en el intento fallido
    const clientId = book.body.client;
    const before = await request(app).get(`/api/v1/admin/ledger/client/${clientId}`).set(ctx.auth);
    expect(before.body.balance).toBe(0);
    const ok = await request(app).post(`/api/v1/admin/appointments/${id}/complete`).set(ctx.auth).send({ payments: [{ tender: "cash", amount: 5000 }], allowDebt: true });
    expect(ok.status).toBe(200);
    expect(ok.body.clientBalance).toBe(-10000);
    // paga la deuda después
    const pay = await request(app).post(`/api/v1/admin/clients/${clientId}/payments`).set(ctx.auth).send({ amount: 10000, method: "transfer", location: String(ctx.location._id) });
    expect(pay.body.balance).toBe(0);
  });

  it("cancelación tardía del cliente retiene la seña", async () => {
    const r = await request(app)
      .post("/api/v1/public/bookings")
      .send({ location: String(ctx.location._id), service: String(ctx.beard._id), barber: String(ctx.lucas._id), date: nextWeekday(new Date().getUTCDay(), 0) === new Date().toISOString().slice(0, 10) ? date : date, time: "18:00", customer: { name: "Laura", phone: "1122221111" } });
    expect(r.status).toBe(201);
    const list = await request(app).get("/api/v1/admin/appointments").set(ctx.auth).query({ code: r.body.code });
    const id = list.body.items[0]._id;
    await request(app).post(`/api/v1/admin/appointments/${id}/approve-deposit`).set(ctx.auth).send({ method: "transfer" });
    const cancel = await request(app).post(`/api/v1/admin/appointments/${id}/cancel`).set(ctx.auth).send({ by: "no_show" });
    expect(cancel.body.status).toBe("no_show");
    expect(cancel.body.cancellation.depositRetained).toBe(true);
    const cancellations = await request(app).get("/api/v1/admin/appointments/cancellations").set(ctx.auth);
    expect(cancellations.body.byType.no_show).toBe(1);
  });
});

describe("Permisos", () => {
  it("sin sesión no se accede al panel", async () => {
    const r = await request(app).get("/api/v1/admin/reports/balances");
    expect(r.status).toBe(401);
  });
});
