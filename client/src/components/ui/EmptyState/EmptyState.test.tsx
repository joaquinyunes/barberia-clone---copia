import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("por defecto el título es un párrafo, no un encabezado", () => {
    render(<EmptyState title="Sin turnos" />);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByText("Sin turnos")).toBeTruthy();
  });

  it("con as=\"h1\" es el encabezado principal de la página", () => {
    render(<EmptyState as="h1" title="Tu carrito está vacío" />);
    expect(screen.getByRole("heading", { level: 1, name: "Tu carrito está vacío" })).toBeTruthy();
  });
});
