import { describe, it, expect } from "vitest";
import { plannedMinutesByDay, type PlannedBlock } from "./plannedMinutes";

// Monday
const MON = "2026-06-15";
const TUE = "2026-06-16";
const WED = "2026-06-17";

function makeBlock(overrides: Partial<PlannedBlock> = {}): PlannedBlock {
  return {
    start_time: "09:00",
    end_time: "11:00",
    days_of_week: [1], // Monday
    category_id: "work",
    ...overrides,
  };
}

describe("plannedMinutesByDay", () => {
  it("returns per-day-per-category minutes for a block scheduled on one day", () => {
    const result = plannedMinutesByDay([makeBlock()], [MON, TUE]);
    expect(result).toEqual([
      { date: MON, work: 120 },
      { date: TUE, work: 0 },
    ]);
  });

  it("sums multiple blocks for the same category and day", () => {
    const blocks = [
      makeBlock({ start_time: "09:00", end_time: "10:00" }),
      makeBlock({ start_time: "14:00", end_time: "15:30" }),
    ];
    const result = plannedMinutesByDay(blocks, [MON]);
    expect(result).toEqual([{ date: MON, work: 150 }]);
  });

  it("keeps separate categories as separate keys", () => {
    const blocks = [
      makeBlock({ category_id: "work", start_time: "09:00", end_time: "10:00" }),
      makeBlock({ category_id: "gym", start_time: "18:00", end_time: "19:00" }),
    ];
    const result = plannedMinutesByDay(blocks, [MON]);
    expect(result).toEqual([{ date: MON, work: 60, gym: 60 }]);
  });

  it("returns zero for days/categories with no matching blocks", () => {
    const result = plannedMinutesByDay([makeBlock({ days_of_week: [1] })], [WED]);
    expect(result).toEqual([{ date: WED, work: 0 }]);
  });

  it("ignores blocks with no category_id", () => {
    const result = plannedMinutesByDay([makeBlock({ category_id: null })], [MON]);
    expect(result).toEqual([{ date: MON }]);
  });

  it("handles an overnight block spanning into the next day", () => {
    const block = makeBlock({ start_time: "23:00", end_time: "07:00", days_of_week: [1] });
    const result = plannedMinutesByDay([block], [MON, TUE]);
    expect(result).toEqual([
      { date: MON, work: 60 },
      { date: TUE, work: 420 },
    ]);
  });
});
