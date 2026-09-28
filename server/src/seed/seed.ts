/**
 * Datos de ejemplo de "Jack el Barbero". Borra la base y la vuelve a crear.
 * Uso: npm run seed   (en producción exige --force)
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { randomCode } from "../lib/codes.js";
import { addDays, businessDayString, toBusinessDate } from "../lib/dates.js";
import { Appointment } from "../modules/appointments/appointment.model.js";
import { Barber } from "../modules/barbers/barber.model.js";
import { CashMovement } from "../modules/cash/cash.model.js";
import * as cash from "../modules/cash/cash.service.js";
import { Client } from "../modules/clients/client.model.js";
import { ensureReferralCode, recomputeTier } from "../modules/clients/client.service.js";
import { MembershipPlan, PackPlan, Promotion } from "../modules/commercial/commercial.models.js";
import * as commercial from "../modules/commercial/commercial.service.js";
import { Product, Supplier, Tool } from "../modules/inventory/inventory.models.js";
import * as inventory from "../modules/inventory/inventory.service.js";
import * as ledger from "../modules/ledger/ledger.service.js";
import { Location } from "../modules/locations/location.model.js";
import { computeCommission } from "../modules/services/commission.service.js";
import { Service } from "../modules/services/service.model.js";
import { getSettings } from "../modules/settings/settings.model.js";
import { Attendance, Goal } from "../modules/staff/staff.models.js";
import * as staff from "../modules/staff/staff.service.js";
import { Station } from "../modules/stations/station.model.js";
import { User } from "../modules/users/user.model.js";

if (env.NODE_ENV === "production" && !process.argv.includes("--force")) {
  console.error("Seed bloqueado en producción. Usá --force si estás seguro.");
  process.exit(1);
}

const actor = { name: "Carga inicial" };
let rnd = 42;
const random = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647); // determinístico
const pick = <T,>(arr: T[]) => arr[Math.floor(random() * arr.length)];

const week = (start: string, end: string, offDays: number[] = [0]) =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => (offDays.includes(day) ? { day, off: true } : { day, start, end, breaks: [{ start: "14:00", end: "14:45", label: "Almuerzo" }] }));

async function main() {
  await connectDB();
  await mongoose.connection.db!.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  const settings = await getSettings();
  settings.whatsappMain = "5491160000000";
  await settings.save();

  /* ── Sedes ── */
  const hours = (open: string, close: string, sunday = false) =>
    [0, 1, 2, 3, 4, 5, 6].map((day) => (day === 0 && !sunday ? { day, closed: true } : { day, open, close }));
  const [palermo, recoleta, centro] = await Location.create([
    {
      slug: "palermo",
      name: "Palermo",
      tagline: "El taller original",
      address: "Honduras 4820, Palermo Soho",
      neighborhood: "Palermo",
      geo: { lat: -34.5889, lng: -58.4306 },
      phone: "+54 11 6000-0001",
      whatsapp: "5491160000001",
      description: "Nuestra primera barbería: sillones de cuero, ladrillo a la vista y el ritual clásico de navaja y toalla caliente en pleno Palermo Soho.",
      features: ["Walk-in y turnos", "Café y cerveza artesanal", "Wi-Fi", "Estacionamiento cercano"],
      images: ["/images/locations/palermo-1.webp", "/images/locations/palermo-2.webp"],
      heroImage: "/images/locations/palermo-hero.webp",
      openingHours: hours("10:00", "21:00"),
      bankAlias: "JACK.PALERMO.MP",
      bankHolder: "Jack el Barbero SRL",
      depositAmount: 5000,
      order: 1,
    },
    {
      slug: "recoleta",
      name: "Recoleta",
      tagline: "Casa de la Cava VIP",
      address: "Av. Alvear 1650, Recoleta",
      neighborhood: "Recoleta",
      geo: { lat: -34.5875, lng: -58.3897 },
      phone: "+54 11 6000-0002",
      whatsapp: "5491160000002",
      description: "Elegancia porteña en una casona restaurada. En el subsuelo está La Cava: nuestro salón privado con whisky de cortesía y rituales de lujo.",
      features: ["Salón VIP La Cava", "Whisky de cortesía", "Solo con turno", "Valet parking"],
      images: ["/images/locations/recoleta-1.webp", "/images/locations/recoleta-2.webp"],
      heroImage: "/images/locations/recoleta-hero.webp",
      openingHours: hours("09:00", "20:00"),
      bankAlias: "JACK.RECOLETA.MP",
      bankHolder: "Jack el Barbero SRL",
      depositAmount: 8000,
      isVip: true,
      order: 2,
    },
    {
      slug: "microcentro",
      name: "Microcentro",
      tagline: "Precisión entre reuniones",
      address: "Reconquista 560, Microcentro",
      neighborhood: "San Nicolás",
      geo: { lat: -34.6005, lng: -58.3731 },
      phone: "+54 11 6000-0003",
      whatsapp: "5491160000003",
      description: "Pensada para el ritmo de la City porteña: cortes de precisión y afeitados express para volver a la oficina impecable.",
      features: ["Express 30 min", "Abre temprano", "Walk-in", "A 2 cuadras de subte B"],
      images: ["/images/locations/microcentro-1.webp"],
      heroImage: "/images/locations/microcentro-hero.webp",
      openingHours: hours("08:00", "19:00"),
      bankAlias: "JACK.CENTRO.MP",
      bankHolder: "Jack el Barbero SRL",
      depositAmount: 4000,
      order: 3,
    },
  ]);
  const locations = [palermo, recoleta, centro];

  /* ── Servicios ── */
  const svc = (s: Record<string, unknown>) => ({ ...s, priceHistory: [{ price: s.price, from: addDays(new Date(), -120), changedBy: "Carga inicial" }] });
  const services = await Service.create([
    svc({ slug: "corte-clasico", name: "Corte clásico", category: "corte", durationMin: 40, price: 14000, supplyCost: 400, description: "Tijera y máquina, lavado y peinado con producto.", includes: ["Lavado", "Corte", "Peinado"], featured: true, order: 1, image: "/images/services/corte-clasico.webp" }),
    svc({ slug: "fade", name: "Fade / degradé", category: "corte", durationMin: 45, price: 16000, supplyCost: 500, commission: { type: "fixed", value: 7500 }, description: "Degradé a navaja o máquina, terminación a mano alzada.", includes: ["Lavado", "Fade", "Terminación a navaja"], featured: true, order: 2, image: "/images/services/fade.webp" }),
    svc({ slug: "barba", name: "Perfilado de barba", category: "barba", durationMin: 30, price: 9000, supplyCost: 300, description: "Perfilado con navaja, toalla caliente y aceite.", includes: ["Toalla caliente", "Navaja", "Aceite para barba"], order: 3, image: "/images/services/barba.webp" }),
    svc({ slug: "corte-y-barba", name: "Corte + barba", category: "combo", durationMin: 60, price: 22000, supplyCost: 700, commission: { type: "fixed", value: 10000 }, description: "El combo completo para salir impecable.", includes: ["Corte", "Barba", "Toalla caliente"], featured: true, order: 4, image: "/images/services/corte-y-barba.webp" }),
    svc({ slug: "afeitado-navaja", name: "Afeitado ritual a navaja", category: "barba", durationMin: 40, price: 12000, supplyCost: 450, description: "El ritual turco: vapor, espuma caliente, doble pasada de navaja y bálsamo.", includes: ["Vapor", "Doble pasada", "Bálsamo"], featured: true, order: 5, image: "/images/services/afeitado.webp" }),
    svc({ slug: "padre-e-hijo", name: "Padre e hijo", category: "combo", durationMin: 70, price: 24000, supplyCost: 700, description: "Dos cortes, un mismo sillón de a turnos. Tradición de familia.", order: 6, image: "/images/services/padre-hijo.webp" }),
    svc({ slug: "color", name: "Color / platinado", category: "color", durationMin: 90, price: 35000, supplyCost: 6000, description: "Decoloración, matiz y tratamiento.", order: 7, image: "/images/services/color.webp" }),
    svc({ slug: "facial", name: "Limpieza facial", category: "tratamiento", durationMin: 30, price: 15000, supplyCost: 1500, description: "Exfoliación, máscara de carbón y hidratación.", order: 8, image: "/images/services/facial.webp" }),
    svc({ slug: "ritual-caballero", name: "Ritual del Caballero", category: "vip", durationMin: 75, price: 38000, supplyCost: 2500, description: "Corte, afeitado ritual, máscara facial y masaje de hombros en La Cava.", includes: ["Corte", "Afeitado ritual", "Máscara facial", "Masaje", "Whisky de cortesía"], locations: [recoleta._id], featured: true, order: 9, image: "/images/services/ritual.webp" }),
    svc({ slug: "el-presidente", name: "El Presidente", category: "vip", durationMin: 110, price: 60000, supplyCost: 4000, commission: { type: "percent", value: 45 }, description: "La experiencia máxima: todo el ritual, más máscara de ojos, depilación con hilo y masaje completo.", includes: ["Corte", "Afeitado", "Máscara facial y de ojos", "Hilo", "Masaje", "Whisky premium"], locations: [recoleta._id], order: 10, image: "/images/services/presidente.webp" }),
  ]);
  const byslug = Object.fromEntries(services.map((s) => [s.slug, s]));

  /* ── Puestos ── */
  const stations = [];
  for (const loc of locations) {
    for (let i = 1; i <= 4; i++) stations.push(await Station.create({ name: `Puesto ${i}`, location: loc._id, lastCleaningAt: addDays(new Date(), -1) }));
  }

  /* ── Barberos ── */
  const barberData = [
    { name: "Lucas Ferreyra", slug: "lucas", location: palermo, specialties: ["Fade", "Diseños"], pct: 50, cat: { barba: 40, color: 35 } },
    { name: "Matías Correa", slug: "matias", location: palermo, specialties: ["Clásicos", "Navaja"], pct: 45, cat: { barba: 45, color: 30 } },
    { name: "Ezequiel Ruiz", slug: "ezequiel", location: recoleta, specialties: ["Rituales VIP", "Afeitado turco"], pct: 50, cat: {} },
    { name: "Tomás Aguirre", slug: "tomas", location: recoleta, specialties: ["Color", "Texturas"], pct: 45, cat: { color: 40 } },
    { name: "Nicolás Benítez", slug: "nicolas", location: centro, specialties: ["Express", "Ejecutivo"], pct: 45, cat: {} },
    { name: "Santiago Molina", slug: "santiago", location: centro, specialties: ["Barbas", "Perfilados"], pct: 50, cat: { barba: 50 } },
  ];
  const barbers = [];
  for (const [i, b] of barberData.entries()) {
    barbers.push(
      await Barber.create({
        name: b.name,
        slug: b.slug,
        phone: `54911700000${i + 1}`,
        dni: `3${i}${i}45${i}78`,
        hiredAt: addDays(new Date(), -400 + i * 40),
        location: b.location._id,
        station: stations.filter((s) => String(s.location) === String(b.location._id))[i % 2]._id,
        photo: `/images/barbers/${b.slug}.webp`,
        bio: `Especialista en ${b.specialties.join(" y ").toLowerCase()}. Formado en la escuela clásica de navaja y tijera.`,
        specialties: b.specialties,
        instagram: `@${b.slug}.jack`,
        schedule: week(i % 2 ? "12:00" : "09:00", i % 2 ? "21:00" : "18:00", i % 3 === 0 ? [0, 3] : [0]),
        defaultCommissionPct: b.pct,
        commissionByCategory: b.cat,
        hourlyRate: 5000,
        attendancePin: `${1000 + i}`,
        order: i,
      }),
    );
  }
  for (const [i, s] of stations.entries()) {
    const b = barbers.find((x) => String(x.station) === String(s._id));
    if (b) await Station.updateOne({ _id: s._id }, { barber: b._id, status: "occupied" });
    else if (i % 4 === 3) await Station.updateOne({ _id: s._id }, { status: "maintenance", notes: "Cambio de tapizado" });
  }

  /* ── Usuarios por rol ── */
  const hash = await bcrypt.hash("jack1234", 10);
  await User.create([
    { name: "Dueño", email: "admin@jackelbarbero.com", passwordHash: hash, role: "admin" },
    { name: "Encargada Palermo", email: "encargado@jackelbarbero.com", passwordHash: hash, role: "manager", locations: [palermo._id] },
    { name: "Recepción", email: "recepcion@jackelbarbero.com", passwordHash: hash, role: "reception" },
    { name: "Lucas Ferreyra", email: "lucas@jackelbarbero.com", passwordHash: hash, role: "barber", barber: barbers[0]._id },
  ]);

  /* ── Proveedores, productos y compras ── */
  const [distri, cosmetica, herramientas] = await Supplier.create([
    { name: "Distribuidora Barber Sur", contactName: "Gustavo", phone: "5491145550001", cuit: "30-71234567-8", supplies: "Pomadas, ceras, aceites", paymentTerms: "30 días" },
    { name: "Cosmética Porteña", contactName: "Paula", phone: "5491145550002", cuit: "30-79876543-2", supplies: "Shampoo, bálsamos, insumos descartables" },
    { name: "Herramientas Pro", contactName: "Diego", phone: "5491145550003", supplies: "Máquinas, trimmers, repuestos" },
  ]);
  const products = await Product.create([
    { name: "Pomada mate Jack", slug: "pomada-mate", sku: "POM-001", kind: "sale", category: "Styling", cost: 6000, price: 14000, stock: 0, minStock: 6, shop: true, featured: true, supplier: distri._id, images: ["/images/shop/pomada-mate.svg"], description: "Fijación media, acabado mate natural. 100 g." },
    { name: "Cera brillo clásico", slug: "cera-brillo", sku: "CER-001", kind: "sale", category: "Styling", cost: 5500, price: 12500, stock: 0, minStock: 6, shop: true, supplier: distri._id, images: ["/images/shop/cera-brillo.svg"], description: "Para peinados clásicos con brillo. 100 g." },
    { name: "Aceite para barba Sándalo", slug: "aceite-barba", sku: "ACE-001", kind: "sale", category: "Barba", cost: 4500, price: 11000, stock: 0, minStock: 5, shop: true, featured: true, supplier: distri._id, images: ["/images/shop/aceite-barba.svg"], description: "Hidrata y suaviza. Notas de sándalo y cedro. 30 ml." },
    { name: "Shampoo anticaspa", slug: "shampoo", sku: "SHA-001", kind: "sale", category: "Cuidado", cost: 3800, price: 9000, stock: 0, minStock: 4, shop: true, supplier: cosmetica._id, images: ["/images/shop/shampoo.svg"], description: "Uso diario, con menta. 250 ml." },
    { name: "Perfume Jack N°1", slug: "perfume", sku: "PER-001", kind: "sale", category: "Fragancias", cost: 15000, price: 32000, stock: 0, minStock: 2, shop: true, supplier: distri._id, images: ["/images/shop/perfume.svg"], description: "Eau de parfum: tabaco, cuero y bergamota. 50 ml." },
    { name: "Peine de carey", slug: "peine", sku: "PEI-001", kind: "sale", category: "Accesorios", cost: 1500, price: 4500, stock: 0, minStock: 5, shop: true, supplier: distri._id, images: ["/images/shop/peine.svg"] },
    { name: "Gift card $20.000", slug: "gift-card-20000", kind: "giftcard", category: "Gift cards", price: 20000, giftValue: 20000, shop: true, featured: true, images: ["/images/shop/giftcard.svg"], description: "Para usar en cualquier servicio o producto, en cualquier sede. Vence en 12 meses." },
    { name: "Gift card $50.000", slug: "gift-card-50000", kind: "giftcard", category: "Gift cards", price: 50000, giftValue: 50000, shop: true, images: ["/images/shop/giftcard.svg"], description: "El regalo perfecto: un ritual completo en La Cava." },
    { name: "Cuchillas descartables (caja x100)", sku: "INS-CUC", kind: "operational", category: "Insumos", cost: 8000, unit: "caja", stock: 0, minStock: 2, supplier: cosmetica._id },
    { name: "Guantes de nitrilo (caja x100)", sku: "INS-GUA", kind: "operational", category: "Insumos", cost: 6500, unit: "caja", stock: 0, minStock: 2, supplier: cosmetica._id },
    { name: "Toallas descartables (x50)", sku: "INS-TOA", kind: "operational", category: "Insumos", cost: 4000, unit: "paquete", stock: 0, minStock: 4, supplier: cosmetica._id },
    { name: "Alcohol 70% (5 L)", sku: "INS-ALC", kind: "operational", category: "Higiene", cost: 7000, unit: "bidón", stock: 0, minStock: 1, supplier: cosmetica._id },
  ]);
  const p = Object.fromEntries(products.map((x) => [x.sku ?? x.slug, x]));

  /* ── Caja de hoy y compras ── */
  await inventory.createPurchase({ supplier: String(distri._id), location: String(palermo._id), date: addDays(new Date(), -20), paidAmount: 150000, method: "transfer", invoiceNumber: "A-0001-00012345", actor, items: [
    { product: String(p["POM-001"]._id), qty: 20, unitCost: 6000 },
    { product: String(p["CER-001"]._id), qty: 12, unitCost: 5500 },
    { product: String(p["ACE-001"]._id), qty: 15, unitCost: 4500 },
    { product: String(p["PER-001"]._id), qty: 4, unitCost: 15000 },
    { product: String(p["PEI-001"]._id), qty: 3, unitCost: 1500 },
  ] });
  await inventory.createPurchase({ supplier: String(cosmetica._id), location: String(palermo._id), date: addDays(new Date(), -10), method: "transfer", actor, items: [
    { product: String(p["SHA-001"]._id), qty: 10, unitCost: 3800 },
    { product: String(p["INS-CUC"]._id), qty: 6, unitCost: 8000 },
    { product: String(p["INS-GUA"]._id), qty: 4, unitCost: 6500 },
    { product: String(p["INS-TOA"]._id), qty: 3, unitCost: 4000 },
  ] });
  await inventory.registerConsumption({ barber: String(barbers[0]._id), items: [{ product: String(p["INS-CUC"]._id), qty: 1 }, { product: String(p["POM-001"]._id), qty: 1 }], reason: "Uso en el puesto", chargeToBarber: "none", actor });

  /* ── Herramientas ── */
  const toolData = [
    { code: "JRL #001", name: "Máquina JRL FreshFade 2020C", brand: "JRL", type: "máquina", purchaseCost: 220000 },
    { code: "JRL #003", name: "Máquina JRL Onyx", brand: "JRL", type: "máquina", purchaseCost: 240000 },
    { code: "TRM #004", name: "Trimmer Wahl Detailer", brand: "Wahl", type: "trimmer", purchaseCost: 150000 },
    { code: "SHV #002", name: "Shaver Andis ProFoil", brand: "Andis", type: "shaver", purchaseCost: 130000 },
    { code: "TIJ #008", name: "Tijera Jaguar 6\"", brand: "Jaguar", type: "tijera", purchaseCost: 90000 },
  ];
  for (const [i, t] of toolData.entries()) {
    const b = barbers[i % barbers.length];
    const lastMaint = addDays(new Date(), -20 - i * 5);
    await Tool.create({ ...t, location: b.location, assignedTo: b._id, assignments: [{ barber: b._id, from: addDays(new Date(), -90) }], purchaseDate: addDays(new Date(), -200), lastMaintenanceAt: lastMaint, nextMaintenanceAt: addDays(lastMaint, 30), maintenance: [{ date: lastMaint, type: "Limpieza y lubricación", cost: 0, by: "Carga inicial" }] });
  }

  /* ── Clientes ── */
  const names = ["Juan Pérez", "Martín Gómez", "Federico López", "Agustín Díaz", "Joaquín Romero", "Franco Sosa", "Bruno Álvarez", "Facundo Torres", "Gonzalo Ruiz", "Ignacio Flores", "Pablo Acosta", "Julián Medina", "Diego Herrera", "Leandro Castro", "Marcos Vega", "Emiliano Rojas", "Tobías Suárez", "Valentín Ríos", "Ramiro Paz", "Sebastián Luna", "Hernán Ortiz", "Rodrigo Silva", "Cristian Núñez", "Alejo Morales", "Thiago Giménez"];
  const clients = [];
  for (const [i, n] of names.entries()) {
    const c = await Client.create({ name: n, phone: `54911${String(50000000 + i * 1379).padStart(8, "0")}`, email: `${n.split(" ")[0].toLowerCase()}${i}@mail.com`, source: pick(["web", "instagram", "walkin", "referido"]) });
    await ensureReferralCode(c);
    clients.push(c);
  }
  for (let i = 5; i < 9; i++) await Client.updateOne({ _id: clients[i]._id }, { referredBy: clients[0]._id, referralRewarded: true });
  await Client.updateOne({ _id: clients[0]._id }, { internalNotes: [{ text: "Siempre paga por transferencia", by: "Dueño" }, { text: "Suele reservar viernes a la tarde", by: "Recepción" }] });

  /* ── Historial: 60 días de turnos completados ── */
  const sessionless = async (loc: unknown, method: string, amount: number, category: string, concept: string, date: Date, refId: unknown) =>
    CashMovement.create({ location: loc, direction: "in", method, amount, fee: method === "mercadopago" ? Math.round(amount * 0.0629) : method === "card" ? Math.round(amount * 0.035) : 0, category, concept, ref: { kind: "Appointment", id: refId }, date, createdByName: "Carga inicial" });

  const serviceMix = ["corte-clasico", "fade", "fade", "barba", "corte-y-barba", "corte-y-barba", "afeitado-navaja", "facial", "color", "padre-e-hijo"];
  for (let d = 60; d >= 1; d--) {
    const day = addDays(new Date(), -d);
    const dayStr = businessDayString(day);
    if (toBusinessDate(dayStr, "12:00").getUTCDay() === 0) continue;
    for (const b of barbers) {
      const slots = 3 + Math.floor(random() * 4);
      for (let k = 0; k < slots; k++) {
        const loc = locations.find((l) => String(l._id) === String(b.location))!;
        const service = loc.isVip && random() < 0.3 ? byslug[pick(["ritual-caballero", "el-presidente"])] : byslug[pick(serviceMix)];
        const client = pick(clients);
        const startsAt = toBusinessDate(dayStr, `${String(10 + k * 2).padStart(2, "0")}:00`);
        const roll = random();
        const status = roll < 0.05 ? "no_show" : roll < 0.1 ? "cancelled" : "completed";
        const appt = await Appointment.create({
          code: randomCode("JEB"),
          location: loc._id,
          service: service._id,
          serviceName: service.name,
          barber: b._id,
          client: client._id,
          startsAt,
          endsAt: new Date(startsAt.getTime() + service.durationMin * 60_000),
          status,
          source: pick(["web", "web", "walkin", "whatsapp", "admin"]),
          price: service.price,
          total: service.price,
          deposit: {},
          createdBy: "Carga inicial",
          ...(status !== "completed" && { cancellation: { by: status === "no_show" ? "no_show" : pick(["client", "client", "business"]), reason: status === "no_show" ? "No asistió" : "Imprevisto", at: addDays(startsAt, -0.2), noticeHours: Math.round(random() * 30) } }),
        });
        if (status !== "completed") continue;
        const method = pick(["cash", "cash", "transfer", "mercadopago", "card"]);
        const ref = { kind: "Appointment", id: appt._id };
        await ledger.post({ ownerType: "client", owner: client._id, type: "service_charge", amount: -service.price, concept: `${service.name} (${appt.code})`, date: startsAt, ref, actor });
        await ledger.post({ ownerType: "client", owner: client._id, type: "payment", amount: service.price, concept: `Pago ${appt.code}`, method, date: startsAt, ref, actor });
        await sessionless(loc._id, method, service.price, "sale", `${service.name} ${appt.code}`, startsAt, appt._id);
        const { amount: commission, rule } = await computeCommission(b, service, service.price);
        await ledger.post({ ownerType: "barber", owner: b._id, type: "commission", amount: commission, concept: `Comisión ${service.name} — ${client.name}`, date: startsAt, ref, actor });
        await Appointment.updateOne({ _id: appt._id }, { completedAt: startsAt, commission, commissionRule: rule, paidAmount: service.price, payments: [{ tender: method, amount: service.price, at: startsAt }] });
        await Client.updateOne({ _id: client._id }, { $inc: { visits: 1 }, $min: { firstVisitAt: startsAt }, $max: { lastVisitAt: startsAt }, preferredBarber: b._id });
      }
    }
  }
  // Algunos clientes en riesgo (no vienen hace mucho) y uno con deuda
  for (const c of clients.slice(18, 22)) await Client.updateOne({ _id: c._id }, { lastVisitAt: addDays(new Date(), -75), avgFrequencyDays: 25, visits: 6 });
  for (const c of clients) {
    const fresh = await Client.findById(c._id);
    if (fresh && fresh.visits > 1 && fresh.firstVisitAt && fresh.lastVisitAt && !fresh.avgFrequencyDays) {
      fresh.avgFrequencyDays = Math.max(7, Math.round((fresh.lastVisitAt.getTime() - fresh.firstVisitAt.getTime()) / 86_400_000 / (fresh.visits - 1)));
      await fresh.save();
    }
    await recomputeTier(c._id);
  }
  await ledger.post({ ownerType: "client", owner: clients[3]._id, type: "service_charge", amount: -15000, concept: "Fade — quedó debiendo", actor });
  await ledger.post({ ownerType: "client", owner: clients[1]._id, type: "credit", amount: 20000, concept: "Pago anticipado", actor });

  /* ── Turnos de hoy y próximos días ── */
  for (const [i, b] of barbers.entries()) {
    for (let k = 0; k < 3; k++) {
      const dayStr = businessDayString(addDays(new Date(), k === 0 ? 0 : k));
      const startsAt = toBusinessDate(dayStr, `${String(12 + k * 2 + (i % 2)).padStart(2, "0")}:00`);
      if (startsAt < new Date()) continue;
      const service = byslug[pick(["fade", "corte-y-barba", "corte-clasico", "barba"])];
      const loc = locations.find((l) => String(l._id) === String(b.location))!;
      await Appointment.create({
        code: randomCode("JEB"),
        location: loc._id,
        service: service._id,
        serviceName: service.name,
        barber: b._id,
        client: pick(clients)._id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + service.durationMin * 60_000),
        status: k === 1 && i % 3 === 0 ? "payment_review" : "confirmed",
        source: "web",
        price: service.price,
        total: service.price,
        deposit: k === 1 && i % 3 === 0 ? { required: loc.depositAmount, method: "transfer", uploadedAt: new Date() } : { required: 0 },
        createdBy: "Web",
      });
    }
  }

  /* ── Comercial ── */
  const [pack10] = await PackPlan.create([
    { name: "Pack 10 cortes", description: "Pagás 8, te llevás 10. Válido 12 meses.", items: [{ category: "corte", label: "Cortes", quantity: 10 }], price: 112000, validityDays: 365 },
    { name: "Pack padre e hijo x4", description: "4 visitas padre e hijo.", items: [{ service: byslug["padre-e-hijo"]._id, label: "Padre e hijo", quantity: 4 }], price: 86000, validityDays: 180 },
    { name: "Pack corte + barba x5", items: [{ service: byslug["corte-y-barba"]._id, label: "Corte + barba", quantity: 5 }], price: 99000, validityDays: 180 },
  ]);
  const [club] = await MembershipPlan.create([
    { name: "Club Jack", description: "4 cortes y 2 barbas por mes, 10% en productos y prioridad en la agenda.", price: 58000, items: [{ category: "corte", label: "Cortes", quantity: 4 }, { category: "barba", label: "Barbas", quantity: 2 }], productDiscountPct: 10, priorityBooking: true, priceLock: true },
    { name: "Club Jack Esencial", description: "2 cortes por mes y 5% en productos.", price: 26000, items: [{ category: "corte", label: "Cortes", quantity: 2 }], productDiscountPct: 5 },
  ]);
  await commercial.subscribe({ plan: String(club._id), client: String(clients[0]._id), payment: { method: "mercadopago", location: String(palermo._id) }, actor });
  await commercial.issuePack({ plan: String(pack10._id), client: String(clients[2]._id), sale: { method: "transfer", location: String(palermo._id) }, actor });
  await commercial.issueGiftCard({ value: 30000, recipientName: "Papá de Martín", buyer: String(clients[1]._id), sale: { method: "card", location: String(palermo._id) }, actor });
  await Promotion.create([
    { name: "Happy hour de martes a jueves", description: "15% off de 14 a 16 h", type: "percent", value: 15, days: [2, 3, 4], timeFrom: "14:00", timeTo: "16:00", automatic: true },
    { name: "Primera visita", code: "NUEVOCLIENTE", type: "percent", value: 10, newClientsOnly: true, maxUsesPerClient: 1 },
    { name: "Corte 10", code: "CORTE10", type: "fixed", value: 2000, services: [byslug["corte-clasico"]._id, byslug.fade._id], maxUses: 200, validTo: addDays(new Date(), 60) },
  ]);

  /* ── Personal: adelantos, deudas, objetivos, asistencia ── */
  await staff.giveAdvance({ barber: String(barbers[0]._id), amount: 40000, method: "transfer", reason: "Adelanto semanal", actor, force: true });
  await staff.giveAdvance({ barber: String(barbers[1]._id), amount: 25000, method: "transfer", reason: "Adelanto", actor, force: true });
  await staff.createDebt({ barber: String(barbers[0]._id), category: "tool", concept: "Compra máquina JRL", total: 180000, installments: 6, firstDueDate: addDays(new Date(), -35), actor });
  await staff.createDebt({ barber: String(barbers[4]._id), category: "loan", concept: "Préstamo personal", total: 100000, installments: 5, disbursed: true, method: "transfer", location: String(centro._id), firstDueDate: addDays(new Date(), 5), actor });
  await staff.applyDueInstallments(barbers[0]._id, new Date(), actor);
  const period = businessDayString(new Date()).slice(0, 7);
  for (const [i, b] of barbers.entries()) {
    await Goal.create({ barber: b._id, period, targets: [{ metric: "revenue", target: 1_200_000 + i * 50_000 }, { metric: "haircuts", target: 50 }], bonus: { type: "fixed", value: 50000 }, tiers: [{ pct: 120, bonus: 20000 }] });
    for (let d = 20; d >= 1; d--) {
      const dayStr = businessDayString(addDays(new Date(), -d));
      const wd = toBusinessDate(dayStr, "12:00").getUTCDay();
      const sched = b.schedule.find((s) => s.day === wd);
      if (!sched || sched.off || !sched.start) continue;
      const late = random() < 0.12 ? Math.floor(random() * 20) + 6 : 0;
      const extra = random() < 0.2 ? Math.floor(random() * 90) : 0;
      const checkIn = toBusinessDate(dayStr, sched.start);
      checkIn.setMinutes(checkIn.getMinutes() + late - 3);
      const scheduledMinutes = 9 * 60 - 45;
      const worked = scheduledMinutes + extra - late + 45;
      await Attendance.create({ barber: b._id, date: dayStr, checkIn, checkOut: new Date(checkIn.getTime() + worked * 60_000), scheduledStart: sched.start, scheduledMinutes, workedMinutes: worked, lateMinutes: Math.max(0, late - 5), overtimeMinutes: Math.max(0, worked - scheduledMinutes - 10), status: random() < 0.03 ? "absent" : "present" });
    }
  }

  /* ── Gastos ── */
  const expenses = [
    { category: "Alquiler", amount: 850000, location: palermo, recurring: true, description: "Alquiler local Palermo" },
    { category: "Alquiler", amount: 1200000, location: recoleta, recurring: true, description: "Alquiler casona Recoleta" },
    { category: "Alquiler", amount: 700000, location: centro, recurring: true, description: "Alquiler Microcentro" },
    { category: "Servicios", amount: 95000, location: palermo, recurring: true, description: "Luz y agua" },
    { category: "Internet", amount: 38000, location: palermo, recurring: true, description: "Fibra 1 Gb" },
    { category: "Publicidad", amount: 120000, location: palermo, description: "Campaña Instagram" },
    { category: "Mantenimiento", amount: 45000, location: recoleta, description: "Service aire acondicionado" },
    { category: "Impuestos", amount: 310000, location: palermo, recurring: true, description: "Ingresos brutos" },
  ];
  for (const [i, e] of expenses.entries()) {
    await inventory.createExpense({ ...e, location: String(e.location._id), method: "transfer", date: addDays(new Date(), -25 + i * 2), actor });
  }

  /* ── Liquidaciones de meses anteriores ya pagadas ── */
  const { monthRange } = await import("../lib/dates.js");
  const thisMonth = monthRange(period);
  for (const b of barbers) {
    await staff.closeSettlement({ barber: String(b._id), from: addDays(thisMonth.start, -62), to: thisMonth.start, label: "Mes anterior", method: "transfer", location: String(b.location), actor });
  }

  /* ── Caja del día abierta en cada sede ── */
  for (const loc of locations) await cash.open(String(loc._id), 50000, actor);

  console.log(`
✔ Base cargada: ${locations.length} sedes, ${services.length} servicios, ${barbers.length} barberos, ${clients.length} clientes,
  ${await Appointment.countDocuments()} turnos, ${products.length} productos.

Usuarios (contraseña: jack1234)
  admin@jackelbarbero.com       → Administrador
  encargado@jackelbarbero.com   → Encargado
  recepcion@jackelbarbero.com   → Recepción
  lucas@jackelbarbero.com       → Barbero (Lucas)
PIN de fichaje de barberos: 1000 a 1005
`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
