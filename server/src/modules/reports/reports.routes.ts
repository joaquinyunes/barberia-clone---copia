import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { businessDayString, currentPeriod, monthRange } from "../../lib/dates.js";
import * as reports from "./reports.service.js";

export const reportsRouter = Router();
reportsRouter.use(authenticate);

const range = (q: Record<string, string>) => {
  if (q.from && q.to) return { start: new Date(q.from), end: new Date(q.to) };
  return monthRange(q.period || currentPeriod());
};

reportsRouter.get("/dashboard", authorize("dashboard.view"), async (req, res) => {
  const q = req.query as Record<string, string>;
  res.json(await reports.dashboard(q.period || currentPeriod(), q.location));
});
reportsRouter.get("/balances", authorize("reports.view"), async (_req, res) => res.json(await reports.balancesCenter()));
reportsRouter.get("/pnl", authorize("reports.view"), async (req, res) => {
  const q = req.query as Record<string, string>;
  const { start, end } = range(q);
  res.json(await reports.profitAndLoss(start, end, q.location));
});
reportsRouter.get("/ranking", authorize("reports.view"), async (req, res) => {
  const q = req.query as Record<string, string>;
  const { start, end } = range(q);
  res.json(await reports.barberRanking(start, end, q.location));
});
reportsRouter.get("/daily-close", authorize("cash.manage", "reports.view"), async (req, res) => {
  const q = req.query as Record<string, string>;
  res.json(await reports.dailyClose(q.date || businessDayString(new Date()), q.location));
});
reportsRouter.get("/service-margins", authorize("reports.view"), async (req, res) => {
  const { start, end } = range(req.query as Record<string, string>);
  res.json(await reports.serviceMargins(start, end));
});
reportsRouter.get("/cash-projection", authorize("reports.view"), async (req, res) => {
  res.json(await reports.cashProjection(Number(req.query.days) || 30));
});
reportsRouter.get("/at-risk-clients", authorize("clients.manage"), async (_req, res) => {
  res.json(await reports.atRiskClients((name) => `¡Hola ${name}! 💈 Hace rato que no te vemos por Jack el Barbero. ¿Te reservamos un turno esta semana? Respondé este mensaje y te pasamos los horarios.`));
});
reportsRouter.get("/pending-orders", authorize("cash.manage"), async (_req, res) => res.json(await reports.ordersPending()));
