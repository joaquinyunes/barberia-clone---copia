import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSlider } from "./useSlider";

describe("useSlider", () => {
  it("avanza y retrocede dando la vuelta, e informa el sentido", () => {
    const { result } = renderHook(() => useSlider(3, 1000));
    expect(result.current.index).toBe(0);

    act(() => result.current.prev());
    expect(result.current).toMatchObject({ index: 2, direction: -1 });
    act(() => result.current.next());
    expect(result.current).toMatchObject({ index: 0, direction: 1 });
  });

  it("goTo elige el sentido según a dónde se salta y ignora la diapositiva actual", () => {
    const { result } = renderHook(() => useSlider(4, 1000));
    act(() => result.current.goTo(3));
    expect(result.current).toMatchObject({ index: 3, direction: 1 });
    act(() => result.current.goTo(1));
    expect(result.current).toMatchObject({ index: 1, direction: -1 });
    act(() => result.current.goTo(1));
    expect(result.current).toMatchObject({ index: 1, direction: -1 }); // sin cambios
  });

  describe("autoplay", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    });
    afterEach(() => vi.useRealTimers());

    const run = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

    it("cambia sola al cumplirse el intervalo y la barra de tiempo vuelve a cero", () => {
      const { result } = renderHook(() => useSlider(3, 1000));
      run(500);
      expect(result.current.progress.get()).toBeGreaterThan(0.3);
      expect(result.current.index).toBe(0);
      run(700);
      expect(result.current.index).toBe(1);
      expect(result.current.progress.get()).toBeLessThan(0.3);
    });

    it("se detiene mientras hay interacción y sigue donde estaba al soltar", () => {
      const { result } = renderHook(() => useSlider(3, 1000));
      run(400);
      act(() => result.current.pause());
      const frozen = result.current.progress.get();
      run(3000);
      expect(result.current.index).toBe(0);
      expect(result.current.progress.get()).toBe(frozen);

      act(() => result.current.resume());
      run(800);
      expect(result.current.index).toBe(1); // faltaba ~0,6 s, no 1 s entero
    });

    it("se pausa con la pestaña oculta", () => {
      const { result } = renderHook(() => useSlider(3, 1000));
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      act(() => void document.dispatchEvent(new Event("visibilitychange")));
      run(3000);
      expect(result.current.index).toBe(0);
      expect(result.current.paused).toBe(true);

      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      act(() => void document.dispatchEvent(new Event("visibilitychange")));
      run(1200);
      expect(result.current.index).toBe(1);
    });
  });
});
