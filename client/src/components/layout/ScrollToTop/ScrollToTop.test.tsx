import { act, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollToTop } from "./ScrollToTop";

describe("ScrollToTop", () => {
  afterEach(() => vi.restoreAllMocks());

  // Chrome reciente devuelve una Promise desde scrollTo: el efecto no debe devolverla,
  // o React la usa como limpieza y rompe con "destroy is not a function".
  it("sube al inicio al cambiar de ruta aunque scrollTo devuelva una Promise", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation((() => Promise.resolve()) as never);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const router = createMemoryRouter(
      [
        { path: "/", element: <ScrollToTop /> },
        { path: "/otra", element: <p>otra página</p> },
      ],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);

    await act(() => router.navigate("/otra"));
    expect(screen.getByText("otra página")).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
