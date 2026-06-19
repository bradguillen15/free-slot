import { describe, it, expect } from "vitest";
import { segmentsForLogOnDay, visibleBlockSegments } from "@/lib/daySegments";

// Each log only needs start_time/end_time for clipping.
const log = (start_time: string, end_time: string) => ({ start_time, end_time });

describe("visibleBlockSegments (planned blocks clip against logged time)", () => {
  it("trims a planned block where a log covers part of it", () => {
    const block = { start_time: "09:00", end_time: "12:00" };
    expect(visibleBlockSegments(block, [log("09:00", "10:30")])).toEqual([
      { startMin: 630, endMin: 720 },
    ]);
  });

  it("removes a planned block fully covered by a log", () => {
    const block = { start_time: "13:00", end_time: "14:00" };
    expect(visibleBlockSegments(block, [log("12:30", "14:30")])).toEqual([]);
  });

  it("splits a planned block when a log covers its middle", () => {
    const block = { start_time: "09:00", end_time: "17:00" };
    expect(visibleBlockSegments(block, [log("12:00", "13:00")])).toEqual([
      { startMin: 540, endMin: 720 },
      { startMin: 780, endMin: 1020 },
    ]);
  });

  it("leaves an overnight block intact when there are no logs", () => {
    const block = { start_time: "23:00", end_time: "08:00" };
    expect(visibleBlockSegments(block, [])).toEqual([
      { startMin: 1380, endMin: 1440 },
      { startMin: 0, endMin: 480 },
    ]);
  });

  it("clips an overnight block by an overnight log", () => {
    const block = { start_time: "23:00", end_time: "08:00" };
    expect(visibleBlockSegments(block, [log("23:00", "01:00")])).toEqual([
      { startMin: 60, endMin: 480 },
    ]);
  });

});

describe("segmentsForLogOnDay", () => {
  it("splits an overnight log between its start day and next day", () => {
    const sleep = { date: "2026-06-15", start_time: "23:00", end_time: "08:00" };
    expect(segmentsForLogOnDay(sleep, "2026-06-15")).toEqual([{ startMin: 1380, endMin: 1440 }]);
    expect(segmentsForLogOnDay(sleep, "2026-06-16")).toEqual([{ startMin: 0, endMin: 480 }]);
    expect(segmentsForLogOnDay(sleep, "2026-06-17")).toEqual([]);
  });
});
