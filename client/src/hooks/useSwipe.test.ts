import type { PointerEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSwipe } from "./useSwipe";

const ev = (x: number, y: number, pointerType = "touch") => ({ clientX: x, clientY: y, pointerType }) as PointerEvent;

function swipe(from: [number, number], to: [number, number], pointerType = "touch") {
  const onSwipe = vi.fn();
  const { result } = renderHook(() => useSwipe(onSwipe));
  result.current.onPointerDown(ev(...from, pointerType));
  result.current.onPointerUp(ev(...to, pointerType));
  return onSwipe;
}

describe("useSwipe", () => {
  it("deslizar a la izquierda avanza (1) y a la derecha retrocede (-1)", () => {
    expect(swipe([300, 100], [200, 105])).toHaveBeenCalledWith(1);
    expect(swipe([100, 100], [220, 95])).toHaveBeenCalledWith(-1);
  });

  it("ignora gestos cortos, mayormente verticales (scroll) y el mouse", () => {
    expect(swipe([300, 100], [270, 100])).not.toHaveBeenCalled(); // muy corto
    expect(swipe([300, 100], [230, 260])).not.toHaveBeenCalled(); // scroll en diagonal
    expect(swipe([300, 100], [100, 100], "mouse")).not.toHaveBeenCalled();
  });

  it("un gesto cancelado no deja estado pendiente", () => {
    const onSwipe = vi.fn();
    const { result } = renderHook(() => useSwipe(onSwipe));
    result.current.onPointerDown(ev(300, 100));
    result.current.onPointerCancel();
    result.current.onPointerUp(ev(100, 100));
    expect(onSwipe).not.toHaveBeenCalled();
  });
});
