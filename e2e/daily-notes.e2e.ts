import {
  test,
  expect,
  seedGuest,
  readGuestDailyNote,
  readGuestInboxItems,
} from "./fixtures/guest";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const skip = { profile: { onboarding_skipped: true } };

/** Non-empty Tiptap JSON document used for seeding. */
const NOTE_CONTENT = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "My focus note" }] }],
};

// ---------------------------------------------------------------------------
// Daily notes — day view
// ---------------------------------------------------------------------------

test.describe("guest daily notes — day view", () => {
  test("shows placeholder button when no note exists", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app");

    await expect(page.getByLabel("Add a note for this day")).toBeVisible();
  });

  test("clicking placeholder expands the rich-text editor", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app");

    await page.getByLabel("Add a note for this day").click();
    await expect(page.locator(".ProseMirror[contenteditable='true']")).toBeVisible();
    // Placeholder is gone once the editor is open
    await expect(page.getByLabel("Add a note for this day")).not.toBeVisible();
  });

  test("typing saves the note to localStorage after debounce and it survives a reload", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app");

    await page.getByLabel("Add a note for this day").click();
    const editor = page.locator(".ProseMirror[contenteditable='true']");
    await expect(editor).toBeVisible();

    // pressSequentially focuses the element and types char-by-char — reliable for ProseMirror
    await editor.pressSequentially("Focus deep work");

    // Verify text landed in the editor before checking persistence
    await expect(editor).toContainText("Focus deep work");

    // Poll until the 300ms debounce fires and the note lands in localStorage
    await expect.poll(() => readGuestDailyNote(page, todayISO()), { timeout: 3000 }).not.toBeNull();

    // After reload the note is loaded from storage → editor shows expanded, placeholder hidden
    await page.reload();
    await expect(page.locator(".ProseMirror[contenteditable='true']")).toBeVisible();
    await expect(page.getByLabel("Add a note for this day")).not.toBeVisible();
  });

  test("seeded note renders the editor expanded on page load", async ({ page }) => {
    await seedGuest(page, {
      ...skip,
      dailyNotes: [{ date: todayISO(), content: NOTE_CONTENT }],
    });
    await page.goto("/app");

    await expect(page.locator(".ProseMirror[contenteditable='true']")).toBeVisible();
    await expect(page.getByLabel("Add a note for this day")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Daily notes — week view presence dot
// ---------------------------------------------------------------------------

test.describe("guest daily notes — week view", () => {
  test("presence dot appears on the day header when that day has a note", async ({ page }) => {
    await seedGuest(page, {
      ...skip,
      dailyNotes: [{ date: todayISO(), content: NOTE_CONTENT }],
    });
    await page.goto("/app/week");

    await expect(page.getByLabel("Has note")).toBeVisible();
  });

  test("no presence dot when no notes exist for the week", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/week");

    await expect(page.getByLabel("Has note")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Inbox — day view
// ---------------------------------------------------------------------------

test.describe("guest inbox — day view", () => {
  test("shows empty state when no items exist", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app");

    await expect(page.getByText(/Nothing pending/)).toBeVisible();
  });

  test("typing and pressing Enter adds an item to the list", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app");

    const input = page.getByLabel("New inbox item");
    await input.fill("Buy oat milk");
    await input.press("Enter");

    await expect(page.getByText("Buy oat milk")).toBeVisible();
    // Input should be cleared after submission
    await expect(input).toHaveValue("");
  });

  test("added item persists after reload", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app");

    await page.getByLabel("New inbox item").fill("Call dentist");
    await page.getByLabel("New inbox item").press("Enter");
    await expect(page.getByText("Call dentist")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Call dentist")).toBeVisible();
  });

  test("archiving an item removes it from the list immediately", async ({ page }) => {
    await seedGuest(page, {
      ...skip,
      inboxItems: [{ id: "i1", content: "Review PR #42" }],
    });
    await page.goto("/app");

    await expect(page.getByText("Review PR #42")).toBeVisible();
    await page.getByLabel("Archive: Review PR #42").click();
    await expect(page.getByText("Review PR #42")).not.toBeVisible();
  });

  test("archived item stays gone after reload and is not in active storage", async ({ page }) => {
    await seedGuest(page, {
      ...skip,
      inboxItems: [{ id: "i1", content: "Plan sprint" }],
    });
    await page.goto("/app");

    await page.getByLabel("Archive: Plan sprint").click();
    await expect(page.getByText("Plan sprint")).not.toBeVisible();

    await page.reload();
    await expect(page.getByText("Plan sprint")).not.toBeVisible();

    const active = await readGuestInboxItems(page);
    expect(active.find((i) => i.content === "Plan sprint")).toBeUndefined();
  });

  test("seeded items are listed on load", async ({ page }) => {
    await seedGuest(page, {
      ...skip,
      inboxItems: [
        { id: "i1", content: "Write blog post" },
        { id: "i2", content: "Update README" },
      ],
    });
    await page.goto("/app");

    await expect(page.getByText("Write blog post")).toBeVisible();
    await expect(page.getByText("Update README")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Inbox — week view
// ---------------------------------------------------------------------------

test.describe("guest inbox — week view", () => {
  test("count badge on toggle button reflects active item count", async ({ page }) => {
    await seedGuest(page, {
      ...skip,
      inboxItems: [
        { id: "i1", content: "Task one" },
        { id: "i2", content: "Task two" },
      ],
    });
    await page.goto("/app/week");

    // Badge sits inside the toggle button
    const toggleBtn = page.getByLabel("Toggle inbox");
    await expect(toggleBtn.getByText("2")).toBeVisible();
  });

  test("inbox panel is hidden by default and opens on toggle click", async ({ page }) => {
    await seedGuest(page, {
      ...skip,
      inboxItems: [{ id: "i1", content: "Side project idea" }],
    });
    await page.goto("/app/week");

    // Panel is closed — input not visible
    await expect(page.getByLabel("New inbox item")).not.toBeVisible();

    // Open
    await page.getByLabel("Toggle inbox").click();
    await expect(page.getByLabel("New inbox item")).toBeVisible();
    await expect(page.getByText("Side project idea")).toBeVisible();
  });

  test("inbox panel closes again on second toggle click", async ({ page }) => {
    await seedGuest(page, skip);
    await page.goto("/app/week");

    await page.getByLabel("Toggle inbox").click();
    await expect(page.getByLabel("New inbox item")).toBeVisible();

    await page.getByLabel("Toggle inbox").click();
    await expect(page.getByLabel("New inbox item")).not.toBeVisible();
  });
});
