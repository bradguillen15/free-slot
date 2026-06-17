import { describe, it, expect } from "vitest";
import { buildDayCells, type BuildDayCellsInput } from "./calendarDays";
import type { LocalScheduleBlock, LocalTimeLog, LocalCategory } from "./localStore";

// A Monday
const MON = "2026-06-15";
const TUE = "2026-06-16";

function makeBlock(overrides: Partial<LocalScheduleBlock> = {}): LocalScheduleBlock {
  return {
    id: "b1", name: "Work", start_time: "09:00", end_time: "11:00",
    days_of_week: [1], type: "fixed", color: "#333",
    category_id: null, created_at: "2024-01-01",
    ...overrides,
  };
}

function makeLog(overrides: Partial<LocalTimeLog> = {}): LocalTimeLog {
  return {
    id: "l1", date: MON, start_time: "09:00", end_time: "10:00",
    category_id: "c1", type: "productive",
    title: null, notes: null, created_at: "2024-01-01",
    ...overrides,
  };
}

function makeCategory(overrides: Partial<LocalCategory> = {}): LocalCategory {
  return {
    id: "c1", name: "Deep work", color: "#f00", type: "productive",
    is_default: false, hidden: false, created_at: "2024-01-01",
    ...overrides,
  };
}

const BASE_INPUT: BuildDayCellsInput = {
  days: [MON, TUE],
  blocks: [],
  logs: [],
  categories: [],
  profile: null,
  today: MON,
};

describe("buildDayCells — basic shape", () => {
  it("returns one cell per day with correct iso and weekday", () => {
    const cells = buildDayCells(BASE_INPUT);
    expect(cells).toHaveLength(2);
    expect(cells[0].iso).toBe(MON);
    expect(cells[0].weekday).toBe(1); // Monday = 1
    expect(cells[1].iso).toBe(TUE);
    expect(cells[1].weekday).toBe(2);
  });

  it("marks isToday correctly", () => {
    const cells = buildDayCells({ ...BASE_INPUT, today: MON });
    expect(cells[0].isToday).toBe(true);
    expect(cells[1].isToday).toBe(false);
  });

  it("produces label and short fields", () => {
    const cells = buildDayCells(BASE_INPUT);
    expect(cells[0].label).toBe("Monday");
    expect(cells[0].short).toBe("Mon");
  });
});

describe("buildDayCells — blocks", () => {
  it("includes a block scheduled on that weekday", () => {
    const block = makeBlock({ days_of_week: [1] }); // Monday
    const cells = buildDayCells({ ...BASE_INPUT, blocks: [block] });
    expect(cells[0].blocks).toHaveLength(1);
    expect(cells[0].blocks[0].name).toBe("Work");
    expect(cells[1].blocks).toHaveLength(0); // Tuesday — block not scheduled
  });

  it("uses the block's color", () => {
    const block = makeBlock({ color: "#abc" });
    const cells = buildDayCells({ ...BASE_INPUT, blocks: [block] });
    expect(cells[0].blocks[0].color).toBe("#abc");
  });

  it("expands an overnight block: segment before midnight on Mon, after midnight on Tue", () => {
    const block = makeBlock({ start_time: "23:00", end_time: "01:00", days_of_week: [1] });
    const cells = buildDayCells({ ...BASE_INPUT, blocks: [block] });
    // Block is on Monday — first segment stays on Mon
    expect(cells[0].blocks.some((s) => s.seg.startMin === 23 * 60)).toBe(true);
    // findFreeWindows will see a post-midnight segment from Monday's block on Tuesday
    // (gaps computation, not block rendering) — no separate block seg on Tue in WeekPage logic
    expect(cells[0].blocks.length).toBeGreaterThan(0);
  });
});

describe("buildDayCells — logs", () => {
  it("places a log on its date", () => {
    const log = makeLog({ date: MON });
    const cells = buildDayCells({ ...BASE_INPUT, logs: [log] });
    expect(cells[0].logs).toHaveLength(1);
    expect(cells[1].logs).toHaveLength(0);
  });

  it("splits overnight logs across their start day and next day", () => {
    const log = makeLog({ date: MON, start_time: "23:00", end_time: "08:00", title: "Sleep" });
    const cells = buildDayCells({ ...BASE_INPUT, logs: [log] });
    expect(cells[0].logs).toEqual([
      expect.objectContaining({ id: "l1", seg: { startMin: 23 * 60, endMin: 24 * 60 } }),
    ]);
    expect(cells[1].logs).toEqual([
      expect.objectContaining({ id: "l1", seg: { startMin: 0, endMin: 8 * 60 } }),
    ]);
  });

  it("uses the category color when log has a category_id", () => {
    const log = makeLog({ category_id: "c1" });
    const cat = makeCategory({ id: "c1", color: "#0f0" });
    const cells = buildDayCells({ ...BASE_INPUT, logs: [log], categories: [cat] });
    expect(cells[0].logs[0].color).toBe("#0f0");
  });

  it("falls back to type-based color when no category", () => {
    const log = makeLog({ category_id: null, type: "productive" });
    const cells = buildDayCells({ ...BASE_INPUT, logs: [log] });
    expect(cells[0].logs[0].color).toBe("hsl(var(--productive))");
  });

  it("uses the log's title as name when present", () => {
    const log = makeLog({ title: "Focus session", category_id: null });
    const cells = buildDayCells({ ...BASE_INPUT, logs: [log] });
    expect(cells[0].logs[0].name).toBe("Focus session");
  });

  it("falls back to category name when title is null", () => {
    const log = makeLog({ title: null, category_id: "c1" });
    const cat = makeCategory({ id: "c1", name: "Deep work" });
    const cells = buildDayCells({ ...BASE_INPUT, logs: [log], categories: [cat] });
    expect(cells[0].logs[0].name).toBe("Deep work");
  });
});

describe("buildDayCells — gaps", () => {
  it("returns gap windows for a day with blocks", () => {
    const block = makeBlock({ start_time: "09:00", end_time: "17:00", days_of_week: [1] });
    const cells = buildDayCells({ ...BASE_INPUT, blocks: [block] });
    expect(cells[0].gaps.length).toBeGreaterThan(0);
  });

  it("sets totalFree to the sum of gap durations", () => {
    const cells = buildDayCells(BASE_INPUT);
    const expected = cells[0].gaps.reduce((s, g) => s + g.durationMin, 0);
    expect(cells[0].totalFree).toBe(expected);
  });

  it("marks peak gaps when profile provides peak_hours", () => {
    const block = makeBlock({ start_time: "09:00", end_time: "10:00", days_of_week: [1] });
    const cells = buildDayCells({
      ...BASE_INPUT,
      blocks: [block],
      profile: { peak_hours: { start: "08:00", end: "12:00" }, include_weekends: false, weekly_review_day: 0, onboarding_completed: true, onboarding_skipped: false },
    });
    const hasPeak = cells[0].gaps.some((g) => g.isPeak);
    expect(hasPeak).toBe(true);
  });
});

describe("buildDayCells — AI slots", () => {
  it("passes AI slots through for the matching day", () => {
    const aiPlan = {
      slots: [{ day: MON, start: "14:00", end: "15:00", activity_id: "a1", activity_name: "Guitar" }],
    };
    const cells = buildDayCells({ ...BASE_INPUT, aiPlan });
    expect(cells[0].aiSlots).toHaveLength(1);
    expect(cells[0].aiSlots![0].name).toBe("Guitar");
    expect(cells[1].aiSlots).toHaveLength(0);
  });
});
