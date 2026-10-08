import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("muestra el diálogo y se cierra con Escape", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Nuevo turno">contenido</Modal>);
    expect(screen.getByRole("dialog", { name: "Nuevo turno" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("al cerrarse se va con animación de salida (no desaparece de golpe) y libera el scroll", async () => {
    const { rerender } = render(<Modal open onClose={() => {}} title="Cobrar">x</Modal>);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Modal open={false} onClose={() => {}} title="Cobrar">x</Modal>);
    expect(document.body.style.overflow).toBe("");
    // Recién cerrado sigue en pantalla mientras anima la salida...
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // ...y después se desmonta.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("clic en el fondo cierra, clic adentro no", () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Cerrar">cuerpo</Modal>);
    fireEvent.mouseDown(screen.getByText("cuerpo"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
