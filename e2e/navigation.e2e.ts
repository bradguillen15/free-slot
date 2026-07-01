import { test, expect, seedGuest } from "./fixtures/guest";

/**
 * Phase 1 — navigation smoke. A guest can enter the app from the landing page
 * and reach every non-authenticated view, with the sidebar reflecting the
 * active route. Settings stays gated behind auth.
 */
test.describe("guest navigation", () => {
  test("enters the app from the landing page without signing in", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("landing-try-app").click();

    // Routes into the guest experience (onboarding or /app), never to auth.
    await expect(page).toHaveURL(/\/(app|onboarding)/);
    await expect(page).not.toHaveURL(/\/auth/);
  });

  test("visits every guest-accessible view", async ({ page }) => {
    // Skip onboarding so the app shell loads directly.
    await seedGuest(page, { profile: { onboarding_skipped: true } });
    await page.goto("/app");

    const navLink = (view: string) => page.getByTestId(`nav-link-${view}`);

    // Day is the index route.
    await expect(page).toHaveURL(/\/app$/);
    await expect(navLink("day")).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("page-day")).toBeVisible();

    const visit = async (view: string, urlRe: RegExp, pageTestId: string) => {
      await navLink(view).click();
      await expect(page).toHaveURL(urlRe);
      await expect(navLink(view)).toHaveAttribute("aria-current", "page");
      await expect(page.getByTestId(pageTestId)).toBeVisible();
    };

    await visit("week", /\/app\/week/, "page-week");
    await visit("month", /\/app\/month/, "page-month");
    await visit("schedule", /\/app\/schedule/, "page-schedule");
    await visit("notes", /\/app\/notes/, "page-notes");
    await visit("labels", /\/app\/labels/, "page-labels");
    await visit("dashboard", /\/app\/dashboard/, "page-dashboard");
    await visit("activities", /\/app\/activities/, "page-activities");
  });

  test("settings shows the Forbidden page for guests, with a sign-in path", async ({ page }) => {
    await seedGuest(page, { profile: { onboarding_skipped: true } });
    await page.goto("/app/settings");

    await expect(page).toHaveURL(/\/app\/settings/);
    const forbidden = page.getByTestId("forbidden-page");
    await expect(forbidden).toBeVisible();

    await forbidden.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/auth/);
  });
});
