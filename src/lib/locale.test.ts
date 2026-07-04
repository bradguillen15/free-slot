import { describe, it, expect } from "vitest";
import { toSupportedLocale } from "./locale";

describe("toSupportedLocale", () => {
  it("returns es for the exact es tag", () => {
    expect(toSupportedLocale("es")).toBe("es");
  });

  it("returns es for region variants like es-MX and es-AR", () => {
    expect(toSupportedLocale("es-MX")).toBe("es");
    expect(toSupportedLocale("es-AR")).toBe("es");
  });

  it("returns en for the exact en tag", () => {
    expect(toSupportedLocale("en")).toBe("en");
  });

  it("returns en for unsupported languages", () => {
    expect(toSupportedLocale("fr")).toBe("en");
  });

  it("returns en when the language is undefined", () => {
    expect(toSupportedLocale(undefined)).toBe("en");
  });
});
