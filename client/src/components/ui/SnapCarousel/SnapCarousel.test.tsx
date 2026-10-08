import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SnapCarousel } from "./SnapCarousel";

/** jsdom no calcula layout: simulamos 4 tarjetas de 300 px dentro de un visor de 600 px. */
function mockLayout({ scrollWidth, clientWidth }: { scrollWidth: number; clientWidth: number }) {
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(scrollWidth);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(clientWidth);
}

const Cards = () => (
  <SnapCarousel label="Servicios">
    {[1, 2, 3, 4].map((n) => <article key={n}>Tarjeta {n}</article>)}
  </SnapCarousel>
);

describe("SnapCarousel", () => {
  afterEach(() => vi.restoreAllMocks());

  it("si todo entra en pantalla no muestra controles ni etiqueta de arrastre", () => {
    mockLayout({ scrollWidth: 600, clientWidth: 600 });
    render(<Cards />);
    expect(screen.getByRole("group", { name: "Servicios" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver siguientes" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Servicios" }).parentElement).not.toHaveAttribute("data-cursor");
  });

  it("si desborda muestra flechas: la de atrás arranca deshabilitada y la de adelante desplaza casi una pantalla", () => {
    mockLayout({ scrollWidth: 1200, clientWidth: 600 });
    const scrollBy = vi.fn();
    HTMLElement.prototype.scrollBy = scrollBy;
    render(<Cards />);

    expect(screen.getByRole("button", { name: "Ver anteriores" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Ver siguientes" }));
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 540 }));
    expect(screen.getByRole("group", { name: "Servicios" }).parentElement).toHaveAttribute("data-cursor", "Arrastrá");
  });

  it("un arrastre con el mouse no dispara el click del link de la tarjeta", () => {
    mockLayout({ scrollWidth: 1200, clientWidth: 600 });
    const onClick = vi.fn();
    render(
      <SnapCarousel label="Servicios">
        <a href="#reservar" onClick={onClick}>Reservar</a>
      </SnapCarousel>,
    );
    const track = screen.getByRole("group", { name: "Servicios" });
    const link = screen.getByText("Reservar");

    fireEvent.pointerDown(track, { pointerType: "mouse", button: 0, clientX: 300 });
    fireEvent.pointerMove(track, { pointerType: "mouse", clientX: 200 });
    fireEvent.click(link); // el click que dispara el navegador al soltar
    expect(onClick).not.toHaveBeenCalled();

    fireEvent.pointerUp(track, { pointerType: "mouse" });
    fireEvent.click(link); // un click normal después sí funciona
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
