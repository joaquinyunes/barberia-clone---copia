import { describe, expect, it } from "vitest";
import { addDaysIso, cx, minutesToHours, periodLabel, phoneDisplay, signedMoney, waHref } from "./format";

describe("format", () => {
  it("formatea montos con signo", () => {
    expect(signedMoney(1500)).toMatch(/^\+\$\s?1\.500$/);
    expect(signedMoney(-1500)).toMatch(/^−\$\s?1\.500$/);
    expect(signedMoney(0)).toMatch(/^\$\s?0$/);
  });

  it("suma días sobre fechas ISO, cruzando meses", () => {
    expect(addDaysIso("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("arma etiquetas de período y duraciones", () => {
    expect(periodLabel("2026-09")).toMatch(/^Septiembre (de )?2026$/);
    expect(minutesToHours(95)).toBe("1 h 35 min");
  });

  it("muestra teléfonos y links de WhatsApp", () => {
    expect(phoneDisplay("5491155551234")).toBe("+54 9 11 5555-1234");
    expect(waHref("+54 9 11 5555-1234", "Hola ¿qué tal?")).toBe("https://wa.me/5491155551234?text=Hola%20%C2%BFqu%C3%A9%20tal%3F");
  });

  it("combina clases ignorando valores vacíos", () => {
    expect(cx("a", false, null, undefined, "b")).toBe("a b");
  });
});
