import { describe, expect, it } from "vitest";
import { computeCommission } from "./commission.service.js";

const fade = { _id: "fade", category: "corte", commission: null };
const beard = { _id: "beard", category: "barba", commission: null };

describe("computeCommission (prioridad de reglas)", () => {
  it("1) excepción barbero-servicio gana sobre todo", async () => {
    const r = await computeCommission(
      { defaultCommissionPct: 50, commissionOverrides: [{ service: "fade", commission: { type: "fixed", value: 8000 } }] },
      { ...fade, commission: { type: "fixed", value: 7000 } },
      15000,
    );
    expect(r).toEqual({ amount: 8000, rule: "barbero-servicio" });
  });
  it("2) comisión propia del servicio (monto fijo)", async () => {
    const r = await computeCommission({ defaultCommissionPct: 50 }, { ...fade, commission: { type: "fixed", value: 7000 } }, 15000);
    expect(r).toEqual({ amount: 7000, rule: "servicio" });
  });
  it("3) % por categoría del barbero", async () => {
    const r = await computeCommission({ defaultCommissionPct: 50, commissionByCategory: { barba: 40 } }, beard, 10000);
    expect(r).toEqual({ amount: 4000, rule: "categoria" });
  });
  it("4) % general del barbero (también con Map de Mongoose)", async () => {
    const r = await computeCommission({ defaultCommissionPct: 45, commissionByCategory: new Map([["color", 30]]) }, fade, 10000);
    expect(r).toEqual({ amount: 4500, rule: "barbero" });
  });
  it("la comisión fija nunca supera el precio cobrado", async () => {
    const r = await computeCommission({}, { ...fade, commission: { type: "fixed", value: 7000 } }, 5000);
    expect(r.amount).toBe(5000);
  });
});
