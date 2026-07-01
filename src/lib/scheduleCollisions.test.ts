import { describe, expect, it } from "vitest";
import { findScheduleCollisions, groupScheduleCollisions } from "./scheduleCollisions";

const block = (
  id: string,
  name: string,
  start: string,
  end: string,
  days: number[]
) => ({ id, name, start_time: start, end_time: end, days_of_week: days });

describe("findScheduleCollisions", () => {
  it("detects overlap when two blocks share time on the same day", () => {
    const blocks = [
      block("a", "Work", "09:00", "17:00", [1, 2, 3, 4, 5]),
      block("b", "Lunch", "12:30", "13:00", [1, 2, 3, 4, 5]),
    ];
    const collisions = findScheduleCollisions(blocks);
    expect(collisions.length).toBeGreaterThan(0);
    expect(collisions.every((c) => c.blockA.name === "Lunch" || c.blockB.name === "Lunch")).toBe(true);
  });

  it("returns nothing when work is split around lunch and break", () => {
    const blocks = [
      block("a", "Work", "09:00", "12:00", [1, 2, 3, 4, 5]),
      block("b", "Lunch", "12:00", "13:00", [1, 2, 3, 4, 5]),
      block("c", "Break", "13:00", "13:25", [1, 2, 3, 4, 5]),
      block("d", "Work", "13:25", "17:00", [1, 2, 3, 4, 5]),
    ];
    expect(findScheduleCollisions(blocks)).toEqual([]);
  });

  it("returns nothing when blocks only touch at an edge", () => {
    const blocks = [
      block("a", "Morning", "09:00", "12:00", [1]),
      block("b", "Afternoon", "12:00", "15:00", [1]),
    ];
    expect(findScheduleCollisions(blocks)).toEqual([]);
  });

  it("returns nothing when blocks are on different days", () => {
    const blocks = [
      block("a", "Work", "09:00", "17:00", [1]),
      block("b", "Gym", "09:00", "17:00", [3]),
    ];
    expect(findScheduleCollisions(blocks)).toEqual([]);
  });

  it("detects overnight wrap overlapping the next morning", () => {
    const blocks = [
      block("a", "Sleep", "23:00", "07:00", [0, 1, 2, 3, 4, 5, 6]),
      block("b", "Morning routine", "06:00", "08:00", [1, 2, 3, 4, 5]),
    ];
    const weekdays = findScheduleCollisions(blocks).map((c) => c.weekday);
    expect(weekdays).toContain(1);
  });
});

describe("groupScheduleCollisions", () => {
  it("merges the same pair across multiple weekdays", () => {
    const collisions = findScheduleCollisions([
      block("a", "Work", "09:00", "17:00", [1, 2, 3]),
      block("b", "Lunch", "12:00", "13:00", [1, 2, 3]),
    ]);
    const groups = groupScheduleCollisions(collisions);
    expect(groups).toHaveLength(1);
    expect(groups[0].weekdays).toEqual([1, 2, 3]);
  });
});
