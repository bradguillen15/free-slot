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

  test("shows a friendly message when signing up with an already-registered email", async ({ page }) => {
    const creds = await signUp(page);

    // Drop the session and try to sign up again with the same email. With email
    // confirmations off (local), GoTrue returns "User already registered", which
    // mapAuthError() turns into the emailExists copy instead of a raw string.
    await page.evaluate(() => localStorage.clear());
    await page.goto("/auth");
    await page.getByTestId("auth-email").fill(creds.email);
    await page.getByTestId("auth-password").fill(creds.password);
    await page.getByTestId("auth-submit").click();

    await expect(page.getByText(/already has an account/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);
  });
});
