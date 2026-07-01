import { test, expect } from "./fixtures/guest";

/**
 * The Sentry error boundary catches render errors and shows a recoverable
 * fallback instead of a blank screen. The `/__boom` route is dev-only and
 * exists purely to trigger a render error here; it is stripped from production
 * builds. In the e2e environment Sentry is not initialized (non-production, no
 * DSN), so no Sentry ingest request should be attempted.
 */
test.describe("error boundary", () => {
  test("shows the fallback on a render error without calling Sentry", async ({ page }) => {
    const sentryRequests: string[] = [];
    page.on("request", (request) => {
      if (/sentry\.io|ingest\.sentry/.test(request.url())) {
        sentryRequests.push(request.url());
      }
    });

    await page.goto("/__boom");

    await expect(page.getByTestId("error-boundary-fallback")).toBeVisible();
    await expect(
      page.getByTestId("error-boundary-fallback").getByRole("button"),
    ).toBeVisible();

    expect(sentryRequests).toHaveLength(0);
  });
});
