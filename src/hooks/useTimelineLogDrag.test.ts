import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TIMELINE_DRAG_CANCEL_PX, useTimelineLogDrag } from "./useTimelineLogDrag";

function createMutableRef<T>(initial: T | null = null) {
  return { current: initial };
}

describe("useTimelineLogDrag", () => {
  it("calls onComplete after the pointer moves past the cancel threshold", () => {
    const onComplete = vi.fn();
    const captureTargetRef = createMutableRef<HTMLDivElement>();
    const { result } = renderHook(() =>
      useTimelineLogDrag({
        enabled: true,
        allowBarDrag: true,
        captureTargetRef,
        onComplete,
      }),
    );

    const el = document.createElement("div");
    captureTargetRef.current = el;
    el.setPointerCapture = vi.fn();
    el.releasePointerCapture = vi.fn();

    const down = {
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
      clientX: 100,
      clientY: 200,
      pointerId: 1,
      currentTarget: el,
    } as unknown as React.PointerEvent;

    act(() => {
      result.current.barPointerDown?.(down);
    });

    const moveDy = TIMELINE_DRAG_CANCEL_PX + 2;
    act(() => {
      result.current.onPointerMove?.({
        clientX: 100,
        clientY: 200 + moveDy,
      } as React.PointerEvent);
    });

    act(() => {
      result.current.onPointerUp?.({
        clientX: 100,
        clientY: 200 + moveDy,
        pointerId: 1,
      } as React.PointerEvent);
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ clientY: 200 + moveDy }),
      { x: 100, y: 200 },
    );
  });

  it("calls onTap when the bar receives a tap without movement", () => {
    const onTap = vi.fn();
    const captureTargetRef = createMutableRef<HTMLDivElement>();
    const { result } = renderHook(() =>
      useTimelineLogDrag({
        enabled: true,
        allowBarDrag: true,
        captureTargetRef,
        onComplete: vi.fn(),
        onTap,
      }),
    );

    const el = document.createElement("div");
    captureTargetRef.current = el;
    el.setPointerCapture = vi.fn();
    el.releasePointerCapture = vi.fn();

    const event = {
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
      clientX: 50,
      clientY: 50,
      pointerId: 2,
      currentTarget: el,
    } as unknown as React.PointerEvent;

    act(() => {
      result.current.barPointerDown?.(event);
      result.current.onPointerUp?.({ ...event, pointerId: 2 } as React.PointerEvent);
    });

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it("does not call onTap when drag starts from the mobile handle", () => {
    const onTap = vi.fn();
    const captureTargetRef = createMutableRef<HTMLDivElement>();
    const { result } = renderHook(() =>
      useTimelineLogDrag({
        enabled: true,
        allowBarDrag: false,
        captureTargetRef,
        onComplete: vi.fn(),
        onTap,
      }),
    );

    const el = document.createElement("div");
    captureTargetRef.current = el;
    el.setPointerCapture = vi.fn();
    el.releasePointerCapture = vi.fn();

    const event = {
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
      clientX: 50,
      clientY: 50,
      pointerId: 3,
      currentTarget: el,
    } as unknown as React.PointerEvent;

    act(() => {
      result.current.startHandleDrag(event);
      result.current.onPointerUp?.({ ...event, pointerId: 3 } as React.PointerEvent);
    });

    expect(onTap).not.toHaveBeenCalled();
  });

  it("does not call onComplete or onTap when the pointer is cancelled", () => {
    const onComplete = vi.fn();
    const onTap = vi.fn();
    const captureTargetRef = createMutableRef<HTMLDivElement>();
    const { result } = renderHook(() =>
      useTimelineLogDrag({
        enabled: true,
        allowBarDrag: true,
        captureTargetRef,
        onComplete,
        onTap,
      }),
    );

    const el = document.createElement("div");
    captureTargetRef.current = el;
    el.setPointerCapture = vi.fn();
    el.releasePointerCapture = vi.fn();

    const down = {
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
      clientX: 100,
      clientY: 100,
      pointerId: 4,
      currentTarget: el,
    } as unknown as React.PointerEvent;

    act(() => {
      result.current.barPointerDown?.(down);
      result.current.onPointerMove?.({
        ...down,
        clientX: 100 + TIMELINE_DRAG_CANCEL_PX + 1,
        clientY: 100,
      } as React.PointerEvent);
      result.current.onPointerCancel?.({ ...down, pointerId: 4 } as React.PointerEvent);
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
  });
});
