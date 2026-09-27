import { Types } from "mongoose";
import { AppError } from "../../lib/AppError.js";
import { addDays, businessDayString, businessTimeString, businessWeekday, monthRange, timeToMinutes } from "../../lib/dates.js";
import { formatARS } from "../../lib/money.js";
import { Appointment } from "../appointments/appointment.model.js";
import { Barber } from "../barbers/barber.model.js";
import * as cash from "../cash/cash.service.js";
import * as ledger from "../ledger/ledger.service.js";
import { getSettings, type PaymentMethod } from "../settings/settings.model.js";
import { Attendance, Debt, DEBT_CATEGORIES, Goal, Settlement } from "./staff.models.js";

type Actor = ledger.Actor;

async function barberOrFail(id: string) {
  const b = await Barber.findById(id);
  if (!b) throw AppError.notFound("Barbero");
  return b;
}

/* ───────────────────────── Adelantos ───────────────────────── */

export async function giveAdvance(input: {
  barber: string;
  amount: number;
  method: PaymentMethod;
  reason?: string;
  location?: string;
  force?: boolean;
  actor: Actor;
}) {
  const barber = await barberOrFail(input.barber);
  const settings = await getSettings();
  const balance = await ledger.balanceOf("barber", barber._id);
  const max = Math.max(0, Math.floor((balance * settings.advanceMaxPctOfBalance) / 100));
  if (input.amount > max && !input.force) {
    throw new AppError(
      409,
      `El adelanto supera el tope (${settings.advanceMaxPctOfBalance}% del saldo disponible = ${formatARS(max)}). Confirmá para forzarlo.`,
      "ADVANCE_LIMIT",
      { balance, max },
    );
  }
  const concept = `Adelanto${input.reason ? ` — ${input.reason}` : ""}`;
  const movement = await ledger.post({
    ownerType: "barber",
    owner: barber._id,
    type: "advance",
    amount: -input.amount,
    concept,
    method: input.method,
    location: input.location ?? barber.location,
    actor: input.actor,
  });
  await cash.record({
    location: input.location ?? barber.location,
    direction: "out",
    method: input.method,
    amount: input.amount,
    category: "advance",
    concept: `${concept} (${barber.name})`,
    party: { kind: "Barber", id: barber._id, name: barber.name },
    ref: { kind: "Movement", id: movement._id },
    actor: input.actor,
  });
  return { movement, balanceBefore: balance, balanceAfter: movement.balanceAfter };
}

/* ───────────────────────── Deudas y cuotas ───────────────────────── */

export async function createDebt(input: {
  barber: string;
  category: keyof typeof DEBT_CATEGORIES;
  concept: string;
  total: number;
  installments: number;
  firstDueDate?: Date;
  frequencyDays?: number;
  disbursed?: boolean;
  method?: PaymentMethod;
  location?: string;
  tool?: string;
  actor: Actor;
}) {
  const barber = await barberOrFail(input.barber);
  const n = Math.max(1, Math.floor(input.installments));
  const base = Math.floor(input.total / n);
  const first = input.firstDueDate ?? new Date();
  const freq = input.frequencyDays ?? 30;
  const installments = Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    amount: i === n - 1 ? input.total - base * (n - 1) : base, // la última absorbe el redondeo
    dueDate: addDays(first, i * freq),
  }));
  const debt = await Debt.create({
    barber: barber._id,
    category: input.category,
    concept: input.concept,
    total: input.total,
    installments,
    disbursed: !!input.disbursed,
    method: input.method,
    location: input.location ?? barber.location,
    tool: input.tool,
    createdBy: input.actor.name,
  });
  if (input.disbursed) {
    await cash.record({
      location: input.location ?? barber.location,
      direction: "out",
      method: input.method ?? "cash",
      amount: input.total,
      category: "loan",
      concept: `${DEBT_CATEGORIES[input.category]}: ${input.concept} (${barber.name})`,
      party: { kind: "Barber", id: barber._id, name: barber.name },
      ref: { kind: "Debt", id: debt._id },
      actor: input.actor,
    });
  }
  return debt;
}

/** Descuenta del saldo del barbero las cuotas vencidas (o todas las que venzan antes de `until`). */
export async function applyDueInstallments(barberId: string | Types.ObjectId, until: Date, actor: Actor) {
  const debts = await Debt.find({ barber: barberId, status: "active" });
  let applied = 0;
  for (const debt of debts) {
    for (const inst of debt.installments) {
      if (inst.status !== "pending" || !inst.dueDate || inst.dueDate > until) continue;
      const m = await ledger.post({
        ownerType: "barber",
        owner: debt.barber,
        type: "debt_installment",
        amount: -(inst.amount ?? 0),
        concept: `${debt.concept} — cuota ${inst.number}/${debt.installments.length}`,
        ref: { kind: "Debt", id: debt._id },
        actor,
      });
      inst.status = "applied";
      inst.appliedAt = new Date();
      inst.movement = m._id;
      applied += inst.amount ?? 0;
    }
    if (debt.installments.every((i) => i.status !== "pending")) debt.status = "paid";
    await debt.save();
  }
  return applied;
}

export async function pendingInstallments(barberId: string | Types.ObjectId, until: Date) {
  const debts = await Debt.find({ barber: barberId, status: "active" }).lean();
  return debts.flatMap((d) =>
    d.installments
      .filter((i) => i.status === "pending" && i.dueDate && i.dueDate <= until)
      .map((i) => ({ debt: d._id, concept: `${d.concept} — cuota ${i.number}/${d.installments.length}`, amount: i.amount ?? 0 })),
  );
}

/* ───────────────────────── Objetivos ───────────────────────── */

export async function barberMetrics(barberId: string | Types.ObjectId, from: Date, to: Date) {
  const rows = await Appointment.aggregate<{
    revenue: number;
    services: number;
    haircuts: number;
    beards: number;
    products: number;
    clients: Types.ObjectId[];
  }>([
    { $match: { barber: new Types.ObjectId(String(barberId)), status: "completed", completedAt: { $gte: from, $lt: to } } },
    { $lookup: { from: "services", localField: "service", foreignField: "_id", as: "svc" } },
    { $unwind: "$svc" },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$total" },
        services: { $sum: 1 },
        haircuts: { $sum: { $cond: [{ $in: ["$svc.category", ["corte", "combo", "vip"]] }, 1, 0] } },
        beards: { $sum: { $cond: [{ $in: ["$svc.category", ["barba", "combo"]] }, 1, 0] } },
        products: { $sum: { $sum: "$products.qty" } },
        clients: { $addToSet: "$client" },
      },
    },
  ]);
  const r = rows[0];
  return {
    revenue: r?.revenue ?? 0,
    services: r?.services ?? 0,
    haircuts: r?.haircuts ?? 0,
    beards: r?.beards ?? 0,
    products: r?.products ?? 0,
    uniqueClients: r?.clients.length ?? 0,
    new_clients: 0,
  };
}

export async function goalProgress(goalId: string) {
  const goal = await Goal.findById(goalId).populate("barber", "name");
  if (!goal) throw AppError.notFound("Objetivo");
  const { start, end } = monthRange(goal.period);
  const metrics = await barberMetrics(String((goal.barber as any)._id ?? goal.barber), start, end);
  const targets = goal.targets.map((t) => {
    const actual = metrics[t.metric as keyof typeof metrics] ?? 0;
    return { metric: t.metric, target: t.target ?? 0, actual, pct: t.target ? Math.round((actual / t.target) * 100) : 0 };
  });
  const pct = targets.length ? Math.min(...targets.map((t) => t.pct)) : 0; // todas las metas deben cumplirse
  const achieved = targets.length > 0 && targets.every((t) => t.actual >= t.target);
  let bonus = 0;
  if (achieved && goal.bonus?.value) {
    bonus = goal.bonus.type === "percent" ? Math.round((metrics.revenue * goal.bonus.value) / 100) : goal.bonus.value;
  }
  for (const tier of goal.tiers ?? []) if (pct >= (tier.pct ?? Infinity)) bonus += tier.bonus ?? 0;
  return { goal, metrics, targets, pct, achieved, bonus };
}

/* ───────────────────────── Asistencia y horas extra ───────────────────────── */

function scheduledFor(barber: { schedule?: { day: number; start?: string | null; end?: string | null; off?: boolean | null; breaks?: { start?: string | null; end?: string | null }[] }[] }, date: string) {
  const day = barber.schedule?.find((d) => d.day === businessWeekday(date));
  if (!day || day.off || !day.start || !day.end) return { start: undefined, minutes: 0 };
  const breaks = (day.breaks ?? []).reduce((a, b) => a + (b.start && b.end ? timeToMinutes(b.end) - timeToMinutes(b.start) : 0), 0);
  return { start: day.start, minutes: timeToMinutes(day.end) - timeToMinutes(day.start) - breaks };
}

export async function checkIn(barberId: string, at = new Date()) {
  const barber = await barberOrFail(barberId);
  const date = businessDayString(at);
  const sched = scheduledFor(barber, date);
  const existing = await Attendance.findOne({ barber: barber._id, date });
  if (existing?.checkIn) throw AppError.conflict("Ya registró la entrada hoy");
  const localNow = timeToMinutes(businessTimeString(at));
  const late = sched.start ? Math.max(0, localNow - timeToMinutes(sched.start) - 5) : 0; // 5 min de tolerancia
  return Attendance.findOneAndUpdate(
    { barber: barber._id, date },
    { checkIn: at, scheduledStart: sched.start, scheduledMinutes: sched.minutes, lateMinutes: late, status: "present" },
    { upsert: true, new: true },
  );
}

export async function checkOut(barberId: string, at = new Date()) {
  const date = businessDayString(at);
  const record = await Attendance.findOne({ barber: barberId, date });
  if (!record?.checkIn) throw AppError.conflict("No hay entrada registrada hoy");
  if (record.checkOut) throw AppError.conflict("Ya registró la salida hoy");
  record.checkOut = at;
  record.workedMinutes = Math.round((at.getTime() - record.checkIn.getTime()) / 60_000);
  record.overtimeMinutes = Math.max(0, record.workedMinutes - record.scheduledMinutes - 10); // 10 min de tolerancia
  await record.save();
  return record;
}

export async function attendanceSummary(barberId: string, from: string, to: string) {
  const rows = await Attendance.find({ barber: barberId, date: { $gte: from, $lt: to } }).sort({ date: 1 }).lean();
  return {
    rows,
    workedMinutes: rows.reduce((a, r) => a + (r.workedMinutes ?? 0), 0),
    overtimeMinutes: rows.reduce((a, r) => a + (r.overtimeMinutes ?? 0), 0),
    lateCount: rows.filter((r) => (r.lateMinutes ?? 0) > 0).length,
    absences: rows.filter((r) => r.status === "absent").length,
  };
}

/* ───────────────────────── Liquidaciones ───────────────────────── */

export async function settlementPreview(barberId: string, from: Date, to: Date) {
  const barber = await barberOrFail(barberId);
  const settings = await getSettings();
  const [totals, balance, installments, sales, goals, overtimeRows] = await Promise.all([
    ledger.totalsByType("barber", barber._id, from, to),
    ledger.balanceOf("barber", barber._id),
    pendingInstallments(barber._id, to),
    barberMetrics(barber._id, from, to),
    Goal.find({ barber: barber._id, bonusApplied: false, period: { $lte: businessDayString(addDays(to, -1)).slice(0, 7) } }),
    Attendance.find({ barber: barber._id, settled: false, date: { $lt: businessDayString(to) } }).lean(),
  ]);

  let goalBonus = 0;
  const goalDetails: { period: string; bonus: number }[] = [];
  for (const g of goals) {
    const p = await goalProgress(String(g._id));
    if (p.bonus > 0) {
      goalBonus += p.bonus;
      goalDetails.push({ period: g.period, bonus: p.bonus });
    }
  }
  const overtimeMinutes = overtimeRows.reduce((a, r) => a + (r.overtimeMinutes ?? 0), 0);
  const rate = barber.hourlyRate ?? settings.overtimeHourRate;
  const overtime = Math.round((overtimeMinutes / 60) * rate);
  const installmentsTotal = installments.reduce((a, i) => a + i.amount, 0);

  const lines = [
    { label: "Comisiones", amount: totals.commission ?? 0 },
    { label: "Propinas", amount: totals.tip ?? 0 },
    { label: "Bonos cargados", amount: totals.bonus ?? 0 },
    { label: "Adelantos", amount: totals.advance ?? 0 },
    { label: "Cuotas ya descontadas", amount: totals.debt_installment ?? 0 },
    { label: "Consumos", amount: totals.consumption ?? 0 },
    { label: "Descuentos", amount: totals.discount ?? 0 },
    { label: "Ajustes", amount: (totals.adjustment ?? 0) + (totals.overtime ?? 0) },
  ].filter((l) => l.amount !== 0);
  const pending = [
    ...(goalBonus ? [{ label: `Bono por objetivo (${goalDetails.map((g) => g.period).join(", ")})`, amount: goalBonus }] : []),
    ...(overtime ? [{ label: `Horas extra (${(overtimeMinutes / 60).toFixed(1)} h × ${formatARS(rate)})`, amount: overtime }] : []),
    ...installments.map((i) => ({ label: i.concept, amount: -i.amount })),
  ];
  const total = balance + goalBonus + overtime - installmentsTotal;

  return {
    barber: { _id: barber._id, name: barber.name },
    from,
    to,
    sales,
    lines, // lo ocurrido en el período
    pending, // lo que se aplica al cerrar
    balance, // saldo actual de la cuenta
    total, // TOTAL A PAGAR
    raw: { totals, goalBonus, overtime, overtimeMinutes, installmentsTotal, goalIds: goals.map((g) => g._id), attendanceIds: overtimeRows.map((r) => r._id) },
  };
}

export async function closeSettlement(input: {
  barber: string;
  from: Date;
  to: Date;
  label?: string;
  method: PaymentMethod;
  location?: string;
  actor: Actor;
}) {
  const preview = await settlementPreview(input.barber, input.from, input.to);
  const barber = await barberOrFail(input.barber);
  const { raw } = preview;

  await applyDueInstallments(barber._id, input.to, input.actor);
  if (raw.goalBonus) {
    await ledger.post({ ownerType: "barber", owner: barber._id, type: "bonus", amount: raw.goalBonus, concept: "Bono por objetivo cumplido", actor: input.actor });
    await Goal.updateMany({ _id: { $in: raw.goalIds } }, { bonusApplied: true });
  }
  if (raw.overtime) {
    await ledger.post({ ownerType: "barber", owner: barber._id, type: "overtime", amount: raw.overtime, concept: `Horas extra (${(raw.overtimeMinutes / 60).toFixed(1)} h)`, actor: input.actor });
  }
  await Attendance.updateMany({ _id: { $in: raw.attendanceIds } }, { settled: true });

  const balanceBefore = await ledger.balanceOf("barber", barber._id);
  const payout = Math.max(0, balanceBefore);
  const settlement = await Settlement.create({
    barber: barber._id,
    label: input.label,
    from: input.from,
    to: input.to,
    servicesCount: preview.sales.services,
    salesTotal: preview.sales.revenue,
    totals: {
      commissions: raw.totals.commission ?? 0,
      tips: raw.totals.tip ?? 0,
      bonus: (raw.totals.bonus ?? 0) + raw.goalBonus,
      overtime: (raw.totals.overtime ?? 0) + raw.overtime,
      advances: raw.totals.advance ?? 0,
      installments: (raw.totals.debt_installment ?? 0) - raw.installmentsTotal,
      consumption: raw.totals.consumption ?? 0,
      discounts: raw.totals.discount ?? 0,
      other: raw.totals.adjustment ?? 0,
    },
    lines: [...preview.lines, ...preview.pending],
    balanceBefore,
    payout,
    carriedOver: Math.min(0, balanceBefore),
    method: input.method,
    status: payout > 0 ? "paid" : "carried",
    paidAt: payout > 0 ? new Date() : undefined,
    closedBy: input.actor.name,
  });
  if (payout > 0) {
    const m = await ledger.post({
      ownerType: "barber",
      owner: barber._id,
      type: "settlement_payment",
      amount: -payout,
      concept: `Pago de liquidación ${input.label ?? ""}`.trim(),
      method: input.method,
      ref: { kind: "Settlement", id: settlement._id },
      actor: input.actor,
    });
    await cash.record({
      location: input.location ?? barber.location,
      direction: "out",
      method: input.method,
      amount: payout,
      category: "settlement",
      concept: `Liquidación ${input.label ?? ""} — ${barber.name}`,
      party: { kind: "Barber", id: barber._id, name: barber.name },
      ref: { kind: "Movement", id: m._id },
      actor: input.actor,
    });
  }
  return settlement;
}
