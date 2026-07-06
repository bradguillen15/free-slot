import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import { errorMessage, toastError } from "./toastError";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const t = ((key: string) => `translated:${key}`) as TFunction;

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
});

describe("errorMessage", () => {
  it("returns the message of an Error", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns the default fallback for non-Error values", () => {
    expect(errorMessage("string failure")).toBe("unknown");
    expect(errorMessage(undefined)).toBe("unknown");
  });

  it("returns a custom fallback for non-Error values", () => {
    expect(errorMessage(42, "try again")).toBe("try again");
  });
});

describe("toastError", () => {
  it("toasts the Error message when available", () => {
    toastError(new Error("save failed"), t);
    expect(toast.error).toHaveBeenCalledWith("save failed");
  });

  it("toasts the translated default fallback for non-Error values", () => {
    toastError("nope", t);
    expect(toast.error).toHaveBeenCalledWith("translated:common.somethingWrong");
  });

  it("toasts a translated custom fallback key for non-Error values", () => {
    toastError(null, t, "week.couldNotReschedule");
    expect(toast.error).toHaveBeenCalledWith("translated:week.couldNotReschedule");
  });
});
