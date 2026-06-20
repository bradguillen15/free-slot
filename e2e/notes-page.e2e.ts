import { test, expect, seedGuest } from "./fixtures/guest";

const skip = { profile: { onboarding_skipped: true } };

const NOTE_CONTENT = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "My daily thought" }] }],
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test.describe("Notes page — navigation", () => {
  test("Notes nav link reaches the notes page", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app");
    await page.getByTestId("nav-link-notes").click();
    await expect(page).toHaveURL(/\/app\/notes/);
    await expect(page.getByTestId("page-notes")).toBeVisible();
  });

  test("direct navigation to /app/notes works", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/notes");
    await expect(page.getByTestId("page-notes")).toBeVisible();
  });
});

test.describe("Notes page — standing note", () => {
  test("standing note editor is visible with formatting toolbar", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/notes");
    await expect(page.getByRole("button", { name: "Bold" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Italic" })).toBeVisible();
  });

  test("typing in the standing note saves to localStorage", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/notes");

    const editor = page.locator(".ProseMirror[contenteditable='true']").first();
    await editor.click();
    await editor.pressSequentially("Running goals");
    await expect(editor).toContainText("Running goals");

    await expect.poll(
      async () => {
        const raw = await page.evaluate(
          (key) => localStorage.getItem(key),
          `freeslot.guest.recurring_notes.${todayISO()}`
        );
        return raw;
      },
      { timeout: 3000 }
    ).not.toBeNull();
  });
});

test.describe("Notes page — daily notes calendar", () => {
  test("shows empty state when selected date has no note", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/notes");
    await expect(page.getByText(/no note for this day/i)).toBeVisible();
  });

  test("shows a seeded daily note card for the default selected date", async ({ page }) => {
    await seedGuest(page, {
      ...skip,
      dailyNotes: [{ date: yesterdayISO(), content: NOTE_CONTENT }],
    });
    await page.goto("/app/notes");
    await expect(page.getByText("My daily thought")).toBeVisible();
  });

  test("calendar renders and shows the month navigation", async ({ page }) => {
    await seedGuest(page, {
      ...skip,
      dailyNotes: [{ date: yesterdayISO(), content: NOTE_CONTENT }],
    });
    await page.goto("/app/notes");
    // react-day-picker renders prev/next month nav buttons
    await expect(page.getByRole("button", { name: /previous month/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /next month/i })).toBeVisible();
  });

  test("clicking a date with a note shows its card", async ({ page }) => {
    const older = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Older note" }] }],
    };
    const d = new Date();
    d.setDate(d.getDate() - 2);
    const twoDaysAgo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    await seedGuest(page, {
      ...skip,
      dailyNotes: [
        { date: yesterdayISO(), content: NOTE_CONTENT },
        { date: twoDaysAgo, content: older },
      ],
    });
    await page.goto("/app/notes");

    // Newest date card shown by default
    await expect(page.getByText("My daily thought")).toBeVisible();

    // Click the day cell for two-days-ago
    const dayNum = new Date(d).getDate();
    await page.getByRole("gridcell", { name: String(dayNum) }).first().click();
    await expect(page.getByText("Older note")).toBeVisible();
  });

});
