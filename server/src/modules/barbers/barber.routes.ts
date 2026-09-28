import { z } from "zod";
import { crudRouter } from "../../core/crudRouter.js";
import { AppError } from "../../lib/AppError.js";
import { businessDayString, currentPeriod, monthRange } from "../../lib/dates.js";
import { Appointment } from "../appointments/appointment.model.js";
import * as ledger from "../ledger/ledger.service.js";
import { Debt, Goal, Settlement } from "../staff/staff.models.js";
import * as staff from "../staff/staff.service.js";
import { Tool } from "../inventory/inventory.models.js";
import { Barber, BARBER_STATUSES, ABSENCE_TYPES } from "./barber.model.js";

const time = z.string().regex(/^\d{2}:\d{2}$/);
const commission = z.object({ type: z.enum(["percent", "fixed"]), value: z.number().min(0) });

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  dni: z.string().optional(),
  birthday: z.coerce.date().optional(),
  hiredAt: z.coerce.date().optional(),
  status: z.enum(BARBER_STATUSES).optional(),
  location: z.string(),
  station: z.string().nullable().optional(),
  photo: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  instagram: z.string().optional(),
  services: z.array(z.string()).optional(),
  schedule: z
    .array(
      z.object({
        day: z.number().min(0).max(6),
        start: time.optional(),
        end: time.optional(),
        off: z.boolean().optional(),
        breaks: z.array(z.object({ start: time, end: time, label: z.string().optional() })).optional(),
      }),
    )
    .optional(),
  absences: z.array(z.object({ from: z.coerce.date(), to: z.coerce.date(), type: z.enum(ABSENCE_TYPES), note: z.string().optional() })).optional(),
  defaultCommissionPct: z.number().min(0).max(100).nullable().optional(),
  commissionByCategory: z.record(z.string(), z.number().min(0).max(100)).optional(),
  commissionOverrides: z.array(z.object({ service: z.string(), commission })).optional(),
  hourlyRate: z.number().min(0).optional(),
  monthlyHours: z.number().min(0).optional(),
  attendancePin: z.string().regex(/^\d{4,6}$/).optional(),
  public: z.boolean().optional(),
  order: z.number().optional(),
});

export const barbersAdminRouter = crudRouter({
  model: Barber,
  entity: "Barbero",
  permission: "barbers.manage",
  schema,
  searchFields: ["name", "phone", "dni"],
  filterFields: ["status", "location"],
  populate: "location",
  sort: { order: 1, name: 1 },
});

/** Ficha completa del barbero: saldo, ventas, turnos, clientes, horas, adelantos, deudas, herramientas. */
barbersAdminRouter.get("/:id/summary", async (req, res) => {
  const barber = await Barber.findById(req.params.id).populate("location station services").lean();
  if (!barber) throw AppError.notFound("Barbero");
  const period = (req.query.period as string) || currentPeriod();
  const { start, end } = monthRange(period);
  const [balance, metrics, upcoming, debts, tools, goal, settlements, attendance, totals] = await Promise.all([
    ledger.balanceOf("barber", barber._id),
    staff.barberMetrics(barber._id, start, end),
    Appointment.find({ barber: barber._id, startsAt: { $gte: new Date() }, status: { $in: ["confirmed", "payment_review", "pending_payment"] } })
      .populate("client service", "name")
      .sort({ startsAt: 1 })
      .limit(20)
      .lean(),
    Debt.find({ barber: barber._id, status: "active" }).lean({ virtuals: true }),
    Tool.find({ assignedTo: barber._id, status: { $ne: "retired" } }).lean(),
    Goal.findOne({ barber: barber._id, period }).lean(),
    Settlement.find({ barber: barber._id }).sort({ createdAt: -1 }).limit(12).lean(),
    staff.attendanceSummary(String(barber._id), businessDayString(start), businessDayString(end)),
    ledger.totalsByType("barber", barber._id, start, end),
  ]);
  res.json({
    barber,
    period,
    balance,
    metrics,
    totals,
    upcoming,
    debts,
    tools,
    goal: goal ? await staff.goalProgress(String(goal._id)) : null,
    settlements,
    attendance: { workedMinutes: attendance.workedMinutes, overtimeMinutes: attendance.overtimeMinutes, lateCount: attendance.lateCount, absences: attendance.absences },
  });
});
