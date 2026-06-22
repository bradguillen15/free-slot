import { test as base, expect, type Page } from "@playwright/test";

/**
 * Guest-flow test fixture.
 *
 * Each Playwright test runs in a fresh browser context, so `localStorage` already
 * starts empty — no manual clearing needed for isolation. This fixture only:
 *  - pins the UI language to English before any app script runs (deterministic
 *    accessible-name selectors regardless of the CI runner's locale), and
 *  - exposes helpers to seed guest preconditions (profile, schedule blocks,
 *    activities, time logs) directly into `localStorage` before navigation.
 *
 * Storage layout mirrors `src/lib/localStore.ts`:
 *   freeslot.guest.profile           -> Profile object
 *   freeslot.guest.categories        -> Category[]
 *   freeslot.guest.activities        -> Activity[]
 *   freeslot.guest.schedule_blocks   -> ScheduleBlock[]
 *   freeslot.guest.time_logs.YYYY-MM -> TimeLog[]
 *   freeslot.guest.bootstrapped      -> "1" once defaults seeded
 */

const PREFIX = "freeslot.guest";

export type GuestProfile = {
  peak_hours?: { start: string; end: string };
  include_weekends?: boolean;
  weekly_review_day?: number;
  onboarding_completed?: boolean;
  onboarding_skipped?: boolean;
};

export type GuestScheduleBlock = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  color?: string;
  type?: "fixed" | "waste_expected";
  category_id?: string | null;
  created_at?: string;
};

export type GuestActivity = {
  id: string;
  name: string;
  category_id?: string | null;
  target_hours_per_week?: number;
  is_active?: boolean;
  created_at?: string;
};

export type GuestTimeLog = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  category_id?: string | null;
  type: "productive" | "unproductive";
  title?: string | null;
  notes?: string | null;
  created_at?: string;
};

export type GuestDailyNote = {
  date: string;
  content: object;
  updated_at?: string;
};

export type GuestInboxItem = {
  id: string;
  content: string;
  created_at?: string;
  archived_at?: string | null;
};

export type GuestSeed = {
  profile?: GuestProfile;
  scheduleBlocks?: GuestScheduleBlock[];
  activities?: GuestActivity[];
  timeLogs?: GuestTimeLog[];
  dailyNotes?: GuestDailyNote[];
  inboxItems?: GuestInboxItem[];
};

const DEFAULT_PROFILE = {
  peak_hours: { start: "09:00", end: "12:00" },
  include_weekends: true,
  weekly_review_day: 0,
  onboarding_completed: false,
  onboarding_skipped: false,
};

/**
 * Seed guest data before the app boots. Must be called before `page.goto(...)`.
 * Sets `bootstrapped = "1"` so the app does not overwrite the seeded data with
 * its default bootstrap; default labels are still topped-up by the app.
 */
export async function seedGuest(page: Page, seed: GuestSeed): Promise<void> {
  await page.addInitScript(
    ({ prefix, defaultProfile, data }) => {
      // Seed exactly once per context. addInitScript runs on every load
      // (including reloads), so without this guard a reload would clobber any
      // changes the app made — breaking persistence assertions.
      const seededFlag = "freeslot.e2e.seeded";
      if (localStorage.getItem(seededFlag)) return;
      localStorage.setItem(seededFlag, "1");

      const now = new Date().toISOString();
      localStorage.setItem(`${prefix}.bootstrapped`, "1");
      localStorage.setItem(
        `${prefix}.profile`,
        JSON.stringify({ ...defaultProfile, ...(data.profile ?? {}) }),
      );
      if (data.scheduleBlocks) {
        localStorage.setItem(
          `${prefix}.schedule_blocks`,
          JSON.stringify(
            data.scheduleBlocks.map((b) => ({
              color: "#3b82f6",
              type: "fixed",
              category_id: null,
              created_at: now,
              ...b,
            })),
          ),
        );
      }
      if (data.activities) {
        localStorage.setItem(
          `${prefix}.activities`,
          JSON.stringify(
            data.activities.map((a) => ({
              category_id: null,
              target_hours_per_week: 1,
              is_active: true,
              created_at: now,
              ...a,
            })),
          ),
        );
      }
      if (data.timeLogs) {
        const byMonth: Record<string, unknown[]> = {};
        for (const log of data.timeLogs) {
          const month = log.date.slice(0, 7);
          (byMonth[month] ??= []).push({
            category_id: null,
            title: null,
            notes: null,
            created_at: now,
            ...log,
          });
        }
        for (const [month, logs] of Object.entries(byMonth)) {
          localStorage.setItem(`${prefix}.time_logs.${month}`, JSON.stringify(logs));
        }
      }
      if (data.dailyNotes) {
        for (const note of data.dailyNotes) {
          localStorage.setItem(
            `${prefix}.daily_notes.${note.date}`,
            JSON.stringify({ updated_at: now, ...note }),
          );
        }
      }
      if (data.inboxItems) {
        localStorage.setItem(`${prefix}.inbox_items`, JSON.stringify(
          data.inboxItems.map((item) => ({ archived_at: null, created_at: now, ...item })),
        ));
      }
    },
    { prefix: PREFIX, defaultProfile: DEFAULT_PROFILE, data: seed },
  );
}

/** Read the guest profile from localStorage (for asserting onboarding outcomes). */
export async function readGuestProfile(page: Page): Promise<GuestProfile> {
  return page.evaluate((prefix) => {
    const raw = localStorage.getItem(`${prefix}.profile`);
    return raw ? JSON.parse(raw) : {};
  }, PREFIX);
}

/** Read the guest schedule blocks from localStorage. */
export async function readGuestScheduleBlocks(page: Page): Promise<GuestScheduleBlock[]> {
  return page.evaluate((prefix) => {
    const raw = localStorage.getItem(`${prefix}.schedule_blocks`);
    return raw ? JSON.parse(raw) : [];
  }, PREFIX);
}

/** Read all guest time logs from localStorage (flattened across monthly buckets). */
export async function readGuestTimeLogs(page: Page): Promise<GuestTimeLog[]> {
  return page.evaluate((prefix) => {
    const out: GuestTimeLog[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${prefix}.time_logs.`)) {
        const raw = localStorage.getItem(key);
        if (raw) out.push(...JSON.parse(raw));
      }
    }
    return out;
  }, PREFIX);
}

/** Read the guest activities from localStorage. */
export async function readGuestActivities(page: Page): Promise<GuestActivity[]> {
  return page.evaluate((prefix) => {
    const raw = localStorage.getItem(`${prefix}.activities`);
    return raw ? JSON.parse(raw) : [];
  }, PREFIX);
}

/** Read the guest categories (labels) from localStorage. */
export async function readGuestCategories(
  page: Page,
): Promise<Array<{ id: string; name: string; type: string; is_default: boolean }>> {
  return page.evaluate((prefix) => {
    const raw = localStorage.getItem(`${prefix}.categories`);
    return raw ? JSON.parse(raw) : [];
  }, PREFIX);
}

/** Read a daily note for a specific date from localStorage. */
export async function readGuestDailyNote(page: Page, date: string): Promise<GuestDailyNote | null> {
  return page.evaluate(
    ({ prefix, date }) => {
      const raw = localStorage.getItem(`${prefix}.daily_notes.${date}`);
      return raw ? JSON.parse(raw) : null;
    },
    { prefix: PREFIX, date },
  );
}

/**
 * Pick a default bootstrap label in an open dialog (QuickLog, ScheduleBlock, etc.).
 * Required since label assignment became mandatory on create flows.
 */
export async function pickDefaultLabel(page: Page, labelName = "Deep work"): Promise<void> {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: labelName }).click();
}

/** Read all (non-archived) guest inbox items from localStorage. */
export async function readGuestInboxItems(page: Page): Promise<GuestInboxItem[]> {
  return page.evaluate((prefix) => {
    const raw = localStorage.getItem(`${prefix}.inbox_items`);
    if (!raw) return [];
    const items: GuestInboxItem[] = JSON.parse(raw);
    return items.filter((i) => !i.archived_at);
  }, PREFIX);
}

export const test = base.extend({
  page: async ({ page }, use) => {
    // Default the language to English before any app script runs, but only when
    // it is not already set — so a deliberate in-app language switch persists
    // across reloads instead of being reset on every load.
    await page.addInitScript(() => {
      try {
        if (!localStorage.getItem("freeslot.lang")) {
          localStorage.setItem("freeslot.lang", "en");
        }
      } catch {
        /* storage unavailable — fall back to detector defaults */
      }
    });
    await use(page);
  },
});

export { expect };
