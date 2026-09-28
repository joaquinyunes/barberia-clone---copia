import { describe, expect, it } from "vitest";
import { buildBookingMessage, buildOrderMessage } from "./buildMessage.js";
import { waLink } from "./waLink.js";

const base = {
  businessName: "Jack el Barbero",
  code: "JEB-7F3K2",
  client: { name: "Juan Pérez", phone: "5491155555555", email: "juan@mail.com" },
  location: { name: "Palermo", address: "Honduras 1234" },
  service: { name: "Corte + Barba", durationMin: 45 },
  barber: { name: "Martín" },
  startsAt: new Date("2026-10-03T14:30:00Z"), // sábado 11:30 en Argentina
  total: 18000,
  deposit: { required: 5000, paid: 5000, method: "transfer" },
  receiptUrl: "https://api.test/c/JEB-7F3K2?t=abc",
  notes: "Degradé bajo",
};

describe("buildBookingMessage", () => {
  it("incluye todos los datos del turno en español", () => {
    const text = buildBookingMessage(base);
    expect(text).toContain("JEB-7F3K2");
    expect(text).toContain("Juan Pérez");
    expect(text).toContain("+5491155555555");
    expect(text).toContain("Palermo – Honduras 1234");
    expect(text).toContain("Corte + Barba (45 min)");
    expect(text).toContain("Martín");
    expect(text).toContain("Sábado 03/10/2026 – 11:30 h");
    expect(text).toMatch(/Total: \$\s?18\.000/);
    expect(text).toMatch(/Seña: \$\s?5\.000 – Transferencia/);
    expect(text).toMatch(/Resta abonar en el local: \$\s?13\.000/);
    expect(text).toContain("Comprobante: https://api.test/c/JEB-7F3K2?t=abc");
    expect(text).toContain('Nota: "Degradé bajo"');
  });

  it("omite líneas vacías (sin email, sin nota, sin comprobante)", () => {
    const text = buildBookingMessage({ ...base, client: { name: "Ana", phone: "549111" }, notes: null, receiptUrl: null });
    expect(text).not.toContain("Email");
    expect(text).not.toContain("Nota");
    expect(text).not.toContain("Comprobante");
  });
});

describe("buildOrderMessage", () => {
  it("lista productos, total y destinatario del regalo", () => {
    const text = buildOrderMessage({
      businessName: "Jack el Barbero",
      code: "PED-AAAAA",
      client: { name: "Juan", phone: "549111" },
      items: [{ name: "Gift card $30.000", qty: 2, unitPrice: 30000 }],
      total: 60000,
      recipient: { name: "Papá" },
      method: "transfer",
    });
    expect(text).toMatch(/2 × Gift card \$30\.000 – \$\s?60\.000/);
    expect(text).toContain("Para: Papá");
  });
});

describe("waLink", () => {
  it("codifica el texto y limpia el número", () => {
    expect(waLink("+54 9 11 5555-0000", "Hola & chau")).toBe("https://wa.me/5491155550000?text=Hola%20%26%20chau");
  });
});
