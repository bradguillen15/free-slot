import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNowMinute } from "./useNowMinute";

describe("useNowMinute", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T09:15:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current minute-of-day when active", () => {
    const { result } = renderHook(() => useNowMinute(true));
    expect(result.current).toBe(9 * 60 + 15); // 555
  });

  it("returns null when inactive", () => {
    const { result } = renderHook(() => useNowMinute(false));
    expect(result.current).toBeNull();
  });

  it("updates on the per-minute tick", () => {
    const { result } = renderHook(() => useNowMinute(true));
    expect(result.current).toBe(555);
    act(() => {
      // Advancing 60s moves the fake clock 09:15 → 09:16; the interval fires once.
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe(556);
  });

  it("clears its interval on unmount", () => {
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useNowMinute(true));
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
