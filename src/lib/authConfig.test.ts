import { describe, it, expect } from "vitest";
import { resetPasswordRedirectTo } from "./authConfig";

/**
 * Guards the recovery redirect target GoTrue receives as `redirectTo`. It must
 * point at the current app origin so reset links return to this deployment —
 * never a hard-coded host. (A localhost redirect in production is a Supabase
 * dashboard Site URL / Redirect URLs misconfig, not a code bug; this only
 * asserts the code builds the right value.)
 */
describe("auth redirect targets", () => {
  it("sends password recovery to /reset-password on the current origin", () => {
    expect(resetPasswordRedirectTo()).toBe(`${window.location.origin}/reset-password`);
  });
});
