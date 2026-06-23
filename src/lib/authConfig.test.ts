import { describe, it, expect } from "vitest";
import { resetPasswordRedirectTo, signUpRedirectTo } from "./authConfig";

/**
 * Guards the redirect targets GoTrue receives as `emailRedirectTo` / `redirectTo`.
 * They must point at the current app origin so confirmation and recovery links
 * return to this deployment — never a hard-coded host. (A localhost redirect in
 * production is a Supabase dashboard Site URL / Redirect URLs misconfig, not a
 * code bug; this only asserts the code builds the right value.)
 */
describe("auth redirect targets", () => {
  it("sends signup confirmations back to /auth on the current origin", () => {
    expect(signUpRedirectTo()).toBe(`${window.location.origin}/auth`);
  });

  it("sends password recovery to /reset-password on the current origin", () => {
    expect(resetPasswordRedirectTo()).toBe(`${window.location.origin}/reset-password`);
  });
});
