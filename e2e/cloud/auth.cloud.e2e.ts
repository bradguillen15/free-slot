import { test, expect, signUp, signIn, serviceClient } from "./fixtures/auth";

/**
 * Cloud auth — real signup/signin against local Supabase (auto-confirm on).
 * A brand-new user has neither onboarding flag, so the gate lands them on
 * `/onboarding`.
 */
test.describe("cloud auth", () => {
  test("signs up, auto-confirms, and lands in onboarding with a profile row", async ({ page }) => {
    const { email, userId } = await signUp(page);

    await expect(page).toHaveURL(/\/onboarding/);

    const { data, error } = await serviceClient()
      .from("profiles")
      .select("id,email")
      .eq("id", userId)
      .single();
    expect(error).toBeNull();
    expect((data as { email: string }).email).toBe(email);
  });

  test("signs back in to an existing account", async ({ page }) => {
    const creds = await signUp(page);

    // Drop the session to simulate a returning visitor, then sign in.
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
    await signIn(page, creds);

    await expect(page).not.toHaveURL(/\/auth/);
  });
});
