import { test, expect, signUp, signIn } from "./fixtures/auth";
import { clearMailpit, waitForEmail, extractActionLink } from "./fixtures/mailpit";

/**
 * Cloud password management — exercises the real GoTrue flows against local
 * Supabase: changing the password while signed in, and the email-based reset
 * (forgot password) flow whose link is read back from Mailpit.
 */
test.describe("cloud password", () => {
  test("changing the password in Settings lets the user sign in with the new one", async ({ page }) => {
    const { email, password } = await signUp(page);
    const newPassword = `${password}-changed`;

    await page.getByTestId("onboarding-skip").click();
    await expect(page).toHaveURL(/\/app/);

    await page.goto("/app/settings");
    await page.getByTestId("settings-current-password").fill(password);
    await page.getByTestId("settings-new-password").fill(newPassword);
    await page.getByTestId("settings-confirm-password").fill(newPassword);
    await page.getByTestId("settings-password-submit").click();
    await expect(page.getByText("Password updated")).toBeVisible();

    // Drop the session and sign back in with the new password.
    await page.evaluate(() => localStorage.clear());
    await signIn(page, { email, password: newPassword });
    await expect(page).not.toHaveURL(/\/auth/);
  });

  test("the forgot-password link emails a reset that sets a new password", async ({ page }) => {
    const { email, password } = await signUp(page);
    const newPassword = `${password}-reset`;
    await clearMailpit();

    // Returning visitor with no session requests a reset from the sign-in screen.
    await page.evaluate(() => localStorage.clear());
    await page.goto("/auth");
    await page.getByTestId("auth-forgot-link").click();
    await page.getByTestId("auth-forgot-email").fill(email);
    await page.getByTestId("auth-forgot-submit").click();

    const body = await waitForEmail(email);
    const link = extractActionLink(body);

    // Following the recovery link lands on /reset-password with a recovery session.
    await page.goto(link);
    await page.getByTestId("reset-new-password").waitFor({ state: "visible" });
    await page.getByTestId("reset-new-password").fill(newPassword);
    await page.getByTestId("reset-confirm-password").fill(newPassword);
    await page.getByTestId("reset-submit").click();
    await page.waitForURL((url) => !url.pathname.startsWith("/reset-password"), { timeout: 15_000 });

    // The new password works on a fresh sign-in.
    await page.evaluate(() => localStorage.clear());
    await signIn(page, { email, password: newPassword });
    await expect(page).not.toHaveURL(/\/auth/);
  });
});
