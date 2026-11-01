import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { setNotifier, type OutgoingMessage } from "../src/lib/notify/notifier.js";
import { Appointment } from "../src/modules/appointments/appointment.model.js";
import { sendDueReminders } from "../src/modules/appointments/reminder.service.js";
import { Client } from "../src/modules/clients/client.model.js";
import { seedBase } from "./fixtures.js";

let ctx: Awaited<ReturnType<typeof seedBase>>;
let client: InstanceType<typeof Client>;
const sent: OutgoingMessage[] = [];
const HOUR = 3_600_000;

const appt = (code: string, hoursAhead: number, status = "confirmed") =>
  Appointment.create({
    code,
    location: ctx.location._id,
    service: ctx.fade._id,
    barber: ctx.lucas._id,
    client: client._id,
    startsAt: new Date(Date.now() + hoursAhead * HOUR),
    endsAt: new Date(Date.now() + hoursAhead * HOUR + 45 * 60_000),
    status,
    price: 15000,
    total: 15000,
  });

beforeAll(async () => {
  ctx = await seedBase();
  client = await Client.create({ name: "Rita Recordada", phone: "5491170000001" });
  setNotifier({ send: async (m) => void sent.push(m) });
});

afterEach(() => {
  sent.length = 0;
});

describe("recordatorios de turno", () => {
  it("avisa una sola vez a los turnos confirmados dentro de las próximas 24 h", async () => {
    await appt("REM-A", 20);
    await appt("REM-B", 40); // todavía falta mucho
    await appt("REM-C", 22, "pending_payment"); // sin seña no está confirmado
    await appt("REM-D", 0.5); // falta menos de 1 h: ya no sirve recordar

    expect(await sendDueReminders()).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("5491170000001");
    expect(sent[0].text).toContain("Rita");
    expect(sent[0].text).toContain("REM-A");
    expect((await Appointment.findOne({ code: "REM-A" }))!.reminderSentAt).toBeTruthy();

    // segunda pasada del job: no repite
    expect(await sendDueReminders()).toBe(0);
    expect(sent).toHaveLength(1);
  });

  it("si el envío falla, el turno queda pendiente para el próximo intento", async () => {
    await appt("REM-E", 10);
    setNotifier({ send: async () => Promise.reject(new Error("sin red")) });
    expect(await sendDueReminders()).toBe(0);
    expect((await Appointment.findOne({ code: "REM-E" }))!.reminderSentAt).toBeFalsy();

    setNotifier({ send: async (m) => void sent.push(m) });
    expect(await sendDueReminders()).toBe(1);
  });
});
