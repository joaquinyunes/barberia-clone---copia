import { Types } from "mongoose";
import { addDays, dayRange, monthRange } from "../../lib/dates.js";
import { waLink } from "../../lib/whatsapp/waLink.js";
import { Appointment } from "../appointments/appointment.model.js";
import { Barber } from "../barbers/barber.model.js";
import { CashMovement, CashSession } from "../cash/cash.model.js";
import { sessionTotals } from "../cash/cash.service.js";
import { Client } from "../clients/client.model.js";
import { GiftCard, Membership, MembershipPlan } from "../commercial/commercial.models.js";
import { Expense, Product, Purchase, StockMovement } from "../inventory/inventory.models.js";
import { Movement } from "../ledger/ledger.model.js";
import { balancesSummary } from "../ledger/ledger.service.js";
import { Order } from "../orders/order.model.js";
import { PAYMENT_METHODS } from "../settings/settings.model.js";
import { Attendance } from "../staff/staff.models.js";
import { attendanceSummary } from "../staff/staff.service.js";

const oid = (id?: string) => (id ? new Types.ObjectId(id) : undefined);
const byLocation = (location?: string) => (location ? { location: oid(location) } : {});

/* ───────── Estado de resultados: facturación ≠ ganancia ───────── */
export async function profitAndLoss(from: Date, to: Date, location?: string) {
  const loc = byLocation(location);
  const [services, cashIn, fees, commissions, cogs, expenses, purchases, retained] = await Promise.all([
    Appointment.aggregate([
      { $match: { ...loc, status: "completed", completedAt: { $gte: from, $lt: to } } },
      { $lookup: { from: "services", localField: "service", foreignField: "_id", as: "svc" } },
      { $unwind: "$svc" },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          gross: { $sum: "$total" },
          prepaid: { $sum: { $ifNull: ["$prepaidCovered", 0] } },
          discounts: { $sum: "$discount" },
          supplies: { $sum: { $ifNull: ["$svc.supplyCost", 0] } },
          products: { $sum: { $reduce: { input: "$products", initialValue: 0, in: { $add: ["$$value", { $multiply: ["$$this.qty", "$$this.unitPrice"] }] } } } },
        },
      },
    ]),
    CashMovement.aggregate([
      { $match: { ...loc, direction: "in", voided: { $ne: true }, date: { $gte: from, $lt: to }, category: { $in: ["product_sale", "membership", "pack", "giftcard_sale"] } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]),
    CashMovement.aggregate([{ $match: { ...loc, voided: { $ne: true }, date: { $gte: from, $lt: to } } }, { $group: { _id: null, total: { $sum: "$fee" } } }]),
    Movement.aggregate([
      { $match: { ownerType: "barber", type: { $in: ["commission", "bonus", "overtime"] }, reversed: { $ne: true }, date: { $gte: from, $lt: to }, ...loc } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]),
    StockMovement.aggregate([
      { $match: { type: "sale", createdAt: { $gte: from, $lt: to }, ...loc } },
      { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "p" } },
      { $unwind: "$p" },
      { $group: { _id: null, total: { $sum: { $multiply: [{ $abs: "$qty" }, "$p.cost"] } } } },
    ]),
    Expense.aggregate([{ $match: { ...loc, voided: { $ne: true }, date: { $gte: from, $lt: to } } }, { $group: { _id: "$category", total: { $sum: "$amount" } } }, { $sort: { total: -1 } }]),
    Purchase.aggregate([{ $match: { ...loc, date: { $gte: from, $lt: to } } }, { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }]),
    Appointment.aggregate([
      { $match: { ...loc, "cancellation.depositRetained": true, "cancellation.at": { $gte: from, $lt: to } } },
      { $group: { _id: null, total: { $sum: "$deposit.paid" } } },
    ]),
  ]);
  const s = services[0] ?? { count: 0, gross: 0, prepaid: 0, discounts: 0, supplies: 0, products: 0 };
  const cashBy = Object.fromEntries(cashIn.map((c) => [c._id, c.total]));
  const comm = Object.fromEntries(commissions.map((c) => [c._id, c.total]));

  const income = {
    services: s.gross - s.prepaid, // lo cubierto por membresía/pack ya se contó al venderlo
    products: s.products + (cashBy.product_sale ?? 0),
    memberships: cashBy.membership ?? 0,
    packs: cashBy.pack ?? 0,
    giftCardsSold: cashBy.giftcard_sale ?? 0,
    retainedDeposits: retained[0]?.total ?? 0,
  };
  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);
  const costs = {
    commissions: comm.commission ?? 0,
    bonusAndOvertime: (comm.bonus ?? 0) + (comm.overtime ?? 0),
    supplies: s.supplies,
    productCost: cogs[0]?.total ?? 0,
    paymentFees: fees[0]?.total ?? 0,
  };
  const totalCosts = Object.values(costs).reduce((a, b) => a + b, 0);
  const totalExpenses = expenses.reduce((a, e) => a + e.total, 0);
  const grossMargin = totalIncome - totalCosts;
  const operatingResult = grossMargin - totalExpenses;
  return {
    from,
    to,
    appointments: s.count,
    discounts: s.discounts,
    income,
    totalIncome,
    costs,
    totalCosts,
    grossMargin,
    expenses: expenses.map((e) => ({ category: e._id, total: e.total })),
    totalExpenses,
    operatingResult,
    marginPct: totalIncome ? Math.round((operatingResult / totalIncome) * 1000) / 10 : 0,
    purchases: { total: purchases[0]?.total ?? 0, count: purchases[0]?.count ?? 0 }, // inversión en stock (flujo de caja)
    note: "Resultado operativo = ingresos − costos directos (comisiones, insumos, costo de productos vendidos, comisiones de medios de pago) − gastos. Las compras de stock se muestran aparte porque su costo se reconoce al vender.",
  };
}

/* ───────── Centro de saldos: dónde está la plata ───────── */
export async function balancesCenter() {
  const [clients, barbers, suppliers, openSessions, giftCards] = await Promise.all([
    balancesSummary("client"),
    balancesSummary("barber"),
    balancesSummary("supplier"),
    CashSession.find({ status: "open" }).populate("location", "name").lean(),
    GiftCard.aggregate([{ $match: { status: "active" } }, { $group: { _id: null, total: { $sum: "$balance" }, count: { $sum: 1 } } }]),
  ]);
  const cash = [];
  for (const s of openSessions) {
    const t = await sessionTotals(s._id);
    cash.push({ session: s._id, location: (s.location as any)?.name, expected: t.expected });
  }
  const cashTotal = cash.reduce((a, c) => a + Object.values(c.expected).reduce((x: number, y) => x + (y as number), 0), 0);
  return {
    clients: { inFavor: clients.positive, inFavorCount: clients.positiveCount, debt: -clients.negative, debtCount: clients.negativeCount },
    barbers: { toPay: barbers.positive, toPayCount: barbers.positiveCount, owesUs: -barbers.negative, owesUsCount: barbers.negativeCount },
    suppliers: { toPay: suppliers.positive, toPayCount: suppliers.positiveCount, inFavor: -suppliers.negative },
    giftCards: { liability: giftCards[0]?.total ?? 0, count: giftCards[0]?.count ?? 0 },
    cash: { total: cashTotal, sessions: cash },
    toCollect: -clients.negative + -barbers.negative,
    toPay: barbers.positive + suppliers.positive + clients.positive + (giftCards[0]?.total ?? 0),
  };
}

/* ───────── Dashboard del dueño ───────── */
export async function dashboard(period: string, location?: string) {
  const { start, end } = monthRange(period);
  const loc = byLocation(location);
  const today = dayRange(new Date().toISOString().slice(0, 10));
  const [pnl, balances, barbers, clients, apptStats, lowStock, pendingReceipts, todayAppts, byDay, newClients] = await Promise.all([
    profitAndLoss(start, end, location),
    balancesCenter(),
    Barber.countDocuments({ status: "active", ...loc }),
    Client.countDocuments({ active: true }),
    Appointment.aggregate([{ $match: { ...loc, startsAt: { $gte: start, $lt: end } } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Product.countDocuments({ active: true, kind: { $ne: "giftcard" }, $expr: { $lte: ["$stock", "$minStock"] } }),
    Appointment.countDocuments({ ...loc, status: "payment_review" }),
    Appointment.find({ ...loc, startsAt: { $gte: today.start, $lt: today.end }, status: { $nin: ["cancelled"] } })
      .populate("client barber service", "name")
      .sort({ startsAt: 1 })
      .lean({ virtuals: true }),
    Appointment.aggregate([
      { $match: { ...loc, status: "completed", completedAt: { $gte: start, $lt: end } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt", timezone: "-03:00" } }, revenue: { $sum: "$total" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Client.countDocuments({ createdAt: { $gte: start, $lt: end } }),
  ]);
  const status = Object.fromEntries(apptStats.map((s) => [s._id, s.count]));
  return {
    period,
    revenue: pnl.totalIncome,
    operatingResult: pnl.operatingResult,
    toCollect: balances.toCollect,
    toPay: balances.toPay,
    barbers,
    clients,
    newClients,
    appointments: (Object.values(status) as number[]).reduce((a, b) => a + b, 0),
    // Por fecha de cobro (completedAt), igual que la facturación y el gráfico por día.
    completed: byDay.reduce((a, d) => a + d.count, 0),
    noShows: status.no_show ?? 0,
    cancelled: status.cancelled ?? 0,
    lowStock,
    pendingReceipts,
    cash: balances.cash.total,
    today: todayAppts,
    byDay,
  };
}

/* ───────── Ranking operativo (no "el mejor", sino métricas) ───────── */
export async function barberRanking(from: Date, to: Date, location?: string) {
  const barbers = await Barber.find({ status: { $ne: "inactive" }, ...byLocation(location) }).lean();
  const rows = [];
  for (const b of barbers) {
    const [appts, commissions, att] = await Promise.all([
      Appointment.aggregate([
        { $match: { barber: b._id, startsAt: { $gte: from, $lt: to } } },
        {
          $group: {
            _id: null,
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            revenue: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$total", 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
            noShows: { $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] } },
            clients: { $addToSet: { $cond: [{ $eq: ["$status", "completed"] }, "$client", "$$REMOVE"] } },
            bookedMinutes: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, { $divide: [{ $subtract: ["$endsAt", "$startsAt"] }, 60000] }, 0] } },
          },
        },
      ]),
      Movement.aggregate([
        { $match: { owner: b._id, type: { $in: ["commission", "tip"] }, reversed: { $ne: true }, date: { $gte: from, $lt: to } } },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
      ]),
      attendanceSummary(String(b._id), from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)),
    ]);
    const a = appts[0] ?? { completed: 0, revenue: 0, cancelled: 0, noShows: 0, clients: [], bookedMinutes: 0 };
    const c = Object.fromEntries(commissions.map((x) => [x._id, x.total]));
    rows.push({
      barber: { _id: b._id, name: b.name },
      clients: a.clients.length,
      services: a.completed,
      revenue: a.revenue,
      avgTicket: a.completed ? Math.round(a.revenue / a.completed) : 0,
      commissions: c.commission ?? 0,
      tips: c.tip ?? 0,
      cancelled: a.cancelled,
      noShows: a.noShows,
      hoursWorked: Math.round((att.workedMinutes / 60) * 10) / 10,
      overtimeHours: Math.round((att.overtimeMinutes / 60) * 10) / 10,
      /** Ocupación: minutos con clientes / minutos trabajados. */
      occupancyPct: att.workedMinutes ? Math.round((a.bookedMinutes / att.workedMinutes) * 100) : null,
      revenuePerHour: att.workedMinutes ? Math.round(a.revenue / (att.workedMinutes / 60)) : null,
    });
  }
  return rows.sort((x, y) => y.revenue - x.revenue);
}

/* ───────── Cierre diario ───────── */
export async function dailyClose(date: string, location?: string) {
  const { start, end } = dayRange(date);
  const loc = byLocation(location);
  const [appts, movements, attendance] = await Promise.all([
    Appointment.find({ ...loc, startsAt: { $gte: start, $lt: end } }).lean(),
    CashMovement.find({ ...loc, voided: { $ne: true }, date: { $gte: start, $lt: end } }).lean(),
    Attendance.find({ date }).populate("barber", "name").lean(),
  ]);
  const byMethod = Object.fromEntries(PAYMENT_METHODS.map((m) => [m, 0])) as Record<string, number>;
  const byCategory: Record<string, number> = {};
  for (const m of movements) {
    const signed = m.direction === "in" ? m.amount : -m.amount;
    byMethod[m.method] += signed;
    byCategory[m.category] = (byCategory[m.category] ?? 0) + signed;
  }
  const completed = appts.filter((a) => a.status === "completed");
  return {
    date,
    appointments: { completed: completed.length, cancelled: appts.filter((a) => a.status === "cancelled").length, noShows: appts.filter((a) => a.status === "no_show").length },
    sales: completed.reduce((a, x) => a + x.total, 0),
    tips: completed.reduce((a, x) => a + (x.tip ?? 0), 0),
    byMethod,
    byCategory,
    expenses: -(byCategory.expense ?? 0),
    advances: -(byCategory.advance ?? 0),
    net: Object.values(byMethod).reduce((a, b) => a + b, 0),
    attendance: attendance.map((a) => ({ barber: (a.barber as any)?.name, checkIn: a.checkIn, checkOut: a.checkOut, lateMinutes: a.lateMinutes, status: a.status })),
  };
}

/* ───────── Margen real por servicio ───────── */
export async function serviceMargins(from: Date, to: Date) {
  const rows = await Appointment.aggregate([
    { $match: { status: "completed", completedAt: { $gte: from, $lt: to } } },
    { $lookup: { from: "services", localField: "service", foreignField: "_id", as: "svc" } },
    { $unwind: "$svc" },
    {
      $group: {
        _id: "$service",
        name: { $first: "$svc.name" },
        durationMin: { $first: "$svc.durationMin" },
        count: { $sum: 1 },
        revenue: { $sum: "$total" },
        commissions: { $sum: { $ifNull: ["$commission", 0] } },
        supplies: { $sum: { $ifNull: ["$svc.supplyCost", 0] } },
      },
    },
  ]);
  return rows
    .map((r) => {
      const margin = r.revenue - r.commissions - r.supplies;
      return {
        service: r.name,
        count: r.count,
        revenue: r.revenue,
        commissions: r.commissions,
        supplies: r.supplies,
        margin,
        marginPct: r.revenue ? Math.round((margin / r.revenue) * 100) : 0,
        /** cuánto deja cada hora de silla dedicada a este servicio */
        marginPerHour: Math.round(margin / ((r.count * r.durationMin) / 60)),
      };
    })
    .sort((a, b) => b.marginPerHour - a.marginPerHour);
}

/* ───────── Proyección de caja a N días ───────── */
export async function cashProjection(days = 30) {
  const now = new Date();
  const horizon = addDays(now, days);
  const lastMonth = addDays(now, -30);
  const [upcoming, balances, recurring, renewals] = await Promise.all([
    Appointment.aggregate([
      { $match: { status: { $in: ["confirmed", "payment_review"] }, startsAt: { $gte: now, $lt: horizon } } },
      { $group: { _id: null, total: { $sum: { $subtract: ["$total", { $ifNull: ["$paidAmount", 0] }] } }, count: { $sum: 1 } } },
    ]),
    balancesCenter(),
    Expense.aggregate([{ $match: { recurring: true, voided: { $ne: true }, date: { $gte: lastMonth } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Membership.find({ status: "active", renewsAt: { $gte: now, $lt: horizon } }).populate("plan", "price").lean(),
  ]);
  const inflow = { appointments: upcoming[0]?.total ?? 0, appointmentsCount: upcoming[0]?.count ?? 0, memberships: renewals.reduce((a, m) => a + ((m.plan as any)?.price ?? 0), 0), clientDebts: balances.clients.debt };
  const outflow = { barbers: balances.barbers.toPay, suppliers: balances.suppliers.toPay, recurringExpenses: Math.round(((recurring[0]?.total ?? 0) * days) / 30) };
  const totalIn = inflow.appointments + inflow.memberships + inflow.clientDebts;
  const totalOut = outflow.barbers + outflow.suppliers + outflow.recurringExpenses;
  return { days, cashNow: balances.cash.total, inflow, outflow, totalIn, totalOut, projected: balances.cash.total + totalIn - totalOut };
}

/* ───────── Clientes en riesgo de no volver ───────── */
export async function atRiskClients(message: (name: string) => string) {
  const clients = await Client.find({ active: true, visits: { $gte: 2 }, lastVisitAt: { $exists: true } }).populate("preferredBarber", "name").lean();
  const now = Date.now();
  return clients
    .map((c) => {
      const freq = Math.max(c.avgFrequencyDays ?? 30, 14);
      const since = Math.floor((now - c.lastVisitAt!.getTime()) / 86_400_000);
      return { client: c, daysSince: since, expectedEvery: freq, overdueDays: since - Math.round(freq * 1.5) };
    })
    .filter((r) => r.overdueDays > 0)
    .sort((a, b) => b.overdueDays - a.overdueDays)
    .slice(0, 200)
    .map((r) => ({
      _id: r.client._id,
      name: r.client.name,
      phone: r.client.phone,
      visits: r.client.visits,
      lastVisitAt: r.client.lastVisitAt,
      preferredBarber: (r.client.preferredBarber as any)?.name,
      daysSince: r.daysSince,
      expectedEvery: r.expectedEvery,
      whatsapp: waLink(r.client.phone, message(r.client.name.split(" ")[0])),
    }));
}

export async function ordersPending() {
  return Order.find({ status: { $in: ["pending_payment", "payment_review"] } }).populate("client location", "name phone").sort({ createdAt: -1 }).lean();
}

export async function membershipOverview() {
  const [active, plans] = await Promise.all([Membership.countDocuments({ status: "active" }), MembershipPlan.find().lean()]);
  return { active, plans };
}
