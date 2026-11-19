import bcrypt from "bcryptjs";
import request from "supertest";
import { setNotifier } from "../src/lib/notify/notifier.js";
import { createApp } from "../src/app.js";
import { Barber } from "../src/modules/barbers/barber.model.js";
import { Location } from "../src/modules/locations/location.model.js";
import { Service } from "../src/modules/services/service.model.js";
import { getSettings } from "../src/modules/settings/settings.model.js";
import { User } from "../src/modules/users/user.model.js";

export const app = createApp();

/** Próxima fecha (YYYY-MM-DD) que cae en el día de semana indicado, al menos `minDays` en el futuro. */
export function nextWeekday(day: number, minDays = 1) {
  const d = new Date(Date.now() + minDays * 86_400_000);
  while (d.getUTCDay() !== day) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const fullWeek = (start: string, end: string) => [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start, end }));

export async function seedBase(suffix = "") {
  await getSettings();
  const location = await Location.create({
    slug: `centro${suffix}`,
    name: `Centro${suffix}`,
    address: "Av. Corrientes 1234",
    whatsapp: "5491155550000",
    bankAlias: "JACK.EL.BARBERO",
    depositAmount: 5000,
    openingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: "09:00", close: "21:00" })),
  });
  const fade = await Service.create({ slug: `fade${suffix}`, name: "Fade", category: "corte", durationMin: 45, price: 15000, supplyCost: 500, commission: { type: "fixed", value: 7000 } });
  const beard = await Service.create({ slug: `barba${suffix}`, name: "Barba", category: "barba", durationMin: 30, price: 8000 });
  const lucas = await Barber.create({
    name: "Lucas",
    slug: `lucas${suffix}`,
    location: location._id,
    schedule: fullWeek("09:00", "21:00"),
    defaultCommissionPct: 50,
    commissionByCategory: { barba: 40 },
  });
  const email = `admin${suffix}@jack.test`;
  await User.create({ name: "Dueño", email, passwordHash: await bcrypt.hash("secreto123", 4), role: "admin" });
  const login = await request(app).post("/api/v1/auth/login").send({ email, password: "secreto123" });
  const token = login.body.accessToken as string;
  const auth = { Authorization: `Bearer ${token}` };
  return { location, fade, beard, lucas, token, auth };
}

/** Registra una cuenta de cliente y la vincula a su ficha con el código que llega al celular (como lo haría la persona real). */
export async function registerLinked(name: string, email: string, phone: string, password = "secreto123") {
  const sent: string[] = [];
  setNotifier({ send: async (m) => void sent.push(m.text) });
  const r = await request(app).post("/api/v1/auth/register").send({ name, email, phone, password });
  if (r.status !== 201) throw new Error(`registro falló: ${r.status}`);
  const auth = { Authorization: `Bearer ${r.body.accessToken}` };
  await request(app).post("/api/v1/me/client/claim/request").set(auth).expect(204);
  const code = /(\d{6})/.exec(sent.at(-1) ?? "")![1];
  await request(app).post("/api/v1/me/client/claim/confirm").set(auth).send({ code }).expect(204);
  return { auth, userId: r.body.user._id as string };
}

/** PNG real mínimo (1×1) para probar la subida de comprobantes. */
export const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
