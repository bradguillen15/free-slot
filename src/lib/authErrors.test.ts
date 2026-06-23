import { describe, it, expect } from "vitest";
import { mapAuthError } from "./authErrors";

describe("mapAuthError", () => {
  it("maps HTTP 429 to the rate-limited key", () => {
    expect(mapAuthError({ status: 429, message: "Request rate limit reached" })).toBe(
      "auth.errors.rateLimited",
    );
  });

  it("maps a GoTrue rate-limit message even without a status", () => {
    expect(mapAuthError({ message: "email rate limit exceeded" })).toBe(
      "auth.errors.rateLimited",
    );
  });

  it("maps an already-registered signup to emailExists", () => {
    expect(
      mapAuthError({ status: 400, code: "user_already_exists", message: "User already registered" }),
    ).toBe("auth.errors.emailExists");
  });

  it("maps invalid login credentials on sign-in", () => {
    expect(mapAuthError({ status: 400, message: "Invalid login credentials" })).toBe(
      "auth.errors.invalidCredentials",
    );
  });

  it("maps an unconfirmed-email sign-in to emailNotConfirmed", () => {
    expect(mapAuthError({ status: 400, code: "email_not_confirmed", message: "Email not confirmed" })).toBe(
      "auth.errors.emailNotConfirmed",
    );
  });

  it("maps the signup-trigger failure to signupFailed", () => {
    expect(mapAuthError({ status: 500, message: "Database error saving new user" })).toBe(
      "auth.errors.signupFailed",
    );
  });

  it("falls back to generic for unknown errors and non-error input", () => {
    expect(mapAuthError(new Error("totally unexpected"))).toBe("auth.errors.generic");
    expect(mapAuthError(null)).toBe("auth.errors.generic");
    expect(mapAuthError(undefined)).toBe("auth.errors.generic");
    expect(mapAuthError("a bare string")).toBe("auth.errors.generic");
  });
});
