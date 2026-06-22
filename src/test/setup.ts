import "@testing-library/jest-dom";
import i18n from "@/i18n";

localStorage.setItem("freeslot.lang", "en");
void i18n.changeLanguage("en");

// jsdom 20 lacks PointerEvent; polyfill extends MouseEvent so clientX/clientY work.
if (!("PointerEvent" in window)) {
  class PointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init?: PointerEventInit) {
      super(type, init as MouseEventInit);
      this.pointerId = (init as { pointerId?: number } | undefined)?.pointerId ?? 0;
    }
  }
  Object.defineProperty(window, "PointerEvent", {
    value: PointerEvent, writable: true, configurable: true,
  });
}
// Polyfill setPointerCapture / releasePointerCapture on elements (jsdom 20 stubs).
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

// jsdom lacks ResizeObserver, which some Radix primitives (e.g. Select) observe on mount.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
