import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  isIosDevice,
  isStandaloneMode,
  usePwaInstall,
  type BeforeInstallPromptEvent,
} from "./usePwaInstall";

function createDeferredPrompt(): BeforeInstallPromptEvent {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const userChoice = Promise.resolve({ outcome: "accepted" as const, platform: "web" });
  return {
    preventDefault: vi.fn(),
    prompt,
    userChoice,
  } as unknown as BeforeInstallPromptEvent;
}

describe("isIosDevice", () => {
  const originalNavigator = navigator;

  afterEach(() => {
    Object.defineProperty(window, "navigator", { value: originalNavigator, configurable: true });
  });

  it("detects iPhone user agents", () => {
    Object.defineProperty(window, "navigator", {
      value: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", platform: "iPhone", maxTouchPoints: 5 },
      configurable: true,
    });
    expect(isIosDevice()).toBe(true);
  });

  it("detects iPad-style MacIntel touch devices", () => {
    Object.defineProperty(window, "navigator", {
      value: { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", platform: "MacIntel", maxTouchPoints: 5 },
      configurable: true,
    });
    expect(isIosDevice()).toBe(true);
  });

  it("returns false for desktop Chrome", () => {
    Object.defineProperty(window, "navigator", {
      value: { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", platform: "MacIntel", maxTouchPoints: 0 },
      configurable: true,
    });
    expect(isIosDevice()).toBe(false);
  });
});

describe("isStandaloneMode", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(navigator, "standalone", { value: undefined, configurable: true });
  });

  it("returns true when navigator.standalone is set", () => {
    Object.defineProperty(navigator, "standalone", { value: true, configurable: true });
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    expect(isStandaloneMode()).toBe(true);
  });

  it("returns true when display-mode is standalone", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    expect(isStandaloneMode()).toBe(true);
  });
});

describe("usePwaInstall", () => {
  const listeners = new Map<string, Set<EventListener>>();

  beforeEach(() => {
    listeners.clear();
    vi.spyOn(window, "addEventListener").mockImplementation((type, listener) => {
      const set = listeners.get(type) ?? new Set();
      set.add(listener as EventListener);
      listeners.set(type, set);
    });
    vi.spyOn(window, "removeEventListener").mockImplementation((type, listener) => {
      listeners.get(type)?.delete(listener as EventListener);
    });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    Object.defineProperty(navigator, "standalone", { value: undefined, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function dispatchWindowEvent(type: string, event: Event) {
    listeners.get(type)?.forEach((listener) => listener(event));
  }

  it("exposes canInstall after beforeinstallprompt is captured", async () => {
    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.canInstall).toBe(false);

    const deferred = createDeferredPrompt();
    act(() => {
      dispatchWindowEvent("beforeinstallprompt", deferred);
    });

    await waitFor(() => expect(result.current.canInstall).toBe(true));
  });

  it("calls prompt and returns accepted when install succeeds", async () => {
    const deferred = createDeferredPrompt();
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      dispatchWindowEvent("beforeinstallprompt", deferred);
    });

    await waitFor(() => expect(result.current.canInstall).toBe(true));

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.install();
    });

    expect(outcome).toBe("accepted");
    expect(deferred.prompt).toHaveBeenCalledTimes(1);
    expect(result.current.canInstall).toBe(false);
  });

  it("marks the app as installed after appinstalled", async () => {
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      dispatchWindowEvent("appinstalled", new Event("appinstalled"));
    });

    await waitFor(() => expect(result.current.isInstalled).toBe(true));
  });

  it("returns unavailable when install is called without a deferred prompt", async () => {
    const { result } = renderHook(() => usePwaInstall());

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.install();
    });

    expect(outcome).toBe("unavailable");
  });
});
